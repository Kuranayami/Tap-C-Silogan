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
import configRoutes from './routes/config.js'
import locationRoutes from './routes/location.js'

import authRoutes from './routes/auth.js'
import riderRoutes from './routes/rider.js'
import adminRoutes from './routes/admin.js'
import cashierRoutes from './routes/cashier.js'
import restaurantRoutes from './routes/restaurant.js'
import rescueRoutes from './routes/rescue.js'
import { loginHandler, requireAdmin, revokeToken } from './middleware/auth.js'
import { ensureMenuLoaded } from './services/supabase.js'
import { ensureBucket } from './services/storage.js'
import { startRescueTimer } from './services/rescue.js'

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
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://*.supabase.co', 'blob:'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://*.googleapis.com'],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

if (isProduction) {
  app.set('trust proxy', 1)
  const trustedHosts = new Set([process.env.ALLOWED_ORIGIN && new URL(process.env.ALLOWED_ORIGIN).host, 'localhost:5000'].filter(Boolean))
  app.use((req, res, next) => {
    const host = req.headers.host
    if (req.headers['x-forwarded-proto'] !== 'https' && host !== 'localhost:5000') {
      if (!host || !trustedHosts.has(host)) return next()
      return res.redirect(301, `https://${host}${req.url}`)
    }
    next()
  })
}

const prodOrigin = process.env.ALLOWED_ORIGIN

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, isProduction ? false : true)
    if (prodOrigin && origin.replace(/\/$/, '') === prodOrigin.replace(/\/$/, '')) return cb(null, true)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true)
    if (origin === 'https://tap-c-silogan.vercel.app') return cb(null, true)
    cb(null, false)
  },
}))

// Body parser — async iteration with size limit
app.use(async (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'DELETE') return next()
  const ct = req.headers['content-type'] || ''
  if (!ct.includes('json') && !ct.includes('urlencoded') && !ct.includes('text')) return next()
  const contentLength = parseInt(req.headers['content-length'], 10)
  if (contentLength > 1048576) {
    return res.status(413).json({ error: 'Request body too large (max 1MB)' })
  }
  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '')
    req.rawBody = raw
    if (raw) {
      if (ct.includes('json')) req.body = JSON.parse(raw)
      else if (ct.includes('urlencoded')) req.body = Object.fromEntries(new URLSearchParams(raw))
      else req.body = raw
    } else {
      req.body = {}
    }
  } catch { req.body = {} }
  next()
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/uploads', express.static(uploadsDir, { maxAge: '1d' }))
app.post('/api/login', authLimiter, loginHandler)
app.post('/api/logout', requireAdmin, revokeToken)
app.use('/api', apiLimiter)
app.use('/api/orders', orderRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/about', aboutRoutes)
app.use('/api/config', configRoutes)
app.use('/api/location', locationRoutes)

app.use('/api/auth', authRoutes)
app.use('/api/rider', riderRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cashier', cashierRoutes)
app.use('/api/restaurant', restaurantRoutes)
app.use('/api/rescue', rescueRoutes)

app.use((err, req, res, next) => {
  console.error('Global error handler:', err?.message || err, err?.stack || '', 'path:', req.path, 'method:', req.method)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5MB)' })
  }
  if (err.message && err.message.includes('Only JPEG')) {
    return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' })
  }
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, async () => {
  await ensureMenuLoaded()
  await ensureBucket()
  startRescueTimer()
  const mode = isProduction ? 'production' : 'development'
  console.log(`Server running on http://localhost:${PORT} [${mode}]`)
})

