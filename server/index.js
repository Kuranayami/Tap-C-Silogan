import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import aboutRoutes from './routes/about.js'
import { loginHandler, requireAdmin, revokeToken } from './middleware/auth.js'
import { ensureMenuLoaded } from './services/supabase.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 5000
const isProduction = process.env.NODE_ENV === 'production'

const uploadsDir = join(__dirname, 'uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

if (isProduction) {
  app.set('trust proxy', 1)
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && req.headers.host !== 'localhost:5000') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`)
    }
    next()
  })
}

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5000',
]

const prodOrigin = process.env.ALLOWED_ORIGIN
if (prodOrigin) allowedOrigins.push(prodOrigin.replace(/\/$/, ''))

app.use(cors({
  origin(origin, cb) {
    if (isProduction && !origin) return cb(null, false)
    if (!origin || allowedOrigins.includes(origin)) cb(null, true)
    else cb(null, false)
  },
}))
app.use(express.json({ limit: '1mb' }))

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many orders placed from this IP, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }))
app.post('/api/login', authLimiter, loginHandler)
app.post('/api/logout', requireAdmin, revokeToken)
app.use('/api/orders', orderLimiter, orderRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/about', aboutRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5MB)' })
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message })
  }
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, async () => {
  await ensureMenuLoaded()
  const mode = isProduction ? 'production' : 'development'
  console.log(`Server running on http://localhost:${PORT} [${mode}]`)
})

