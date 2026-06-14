import { randomBytes } from 'crypto'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

const CASHIER_USER = process.env.CASHIER_USER || 'cashier'
const CASHIER_PASS = process.env.CASHIER_PASS || 'cashier123'
const tokens = new Set()

export function generateToken() {
  const token = randomBytes(32).toString('hex')
  tokens.add(token)
  return token
}

export function requireCashier(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.slice(7)
  if (!tokens.has(token)) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  next()
}

export function revokeToken(req, res) {
  const header = req.headers.authorization
  const token = header.slice(7)
  tokens.delete(token)
  res.json({ message: 'Logged out' })
}

export function loginHandler(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  if (username !== CASHIER_USER || password !== CASHIER_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = generateToken()
  res.json({ token })
}
