import { randomBytes } from 'crypto'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

const ADMIN_USER = process.env.ADMIN_USER || 'admin'
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123'

if (!process.env.ADMIN_PASS || process.env.ADMIN_PASS === 'admin123') {
  console.warn('[SECURITY] Using default admin password. Set ADMIN_PASS in .env')
}

const TOKENS_FILE = join(__dirname, '../data/admin_tokens.json')
let tokens = new Set()

function loadTokens() {
  if (existsSync(TOKENS_FILE)) {
    try { tokens = new Set(JSON.parse(readFileSync(TOKENS_FILE, 'utf-8'))) } catch {}
  }
}
function saveTokens() {
  writeFileSync(TOKENS_FILE, JSON.stringify([...tokens]), 'utf-8')
}
loadTokens()

export function generateToken() {
  const token = randomBytes(32).toString('hex')
  tokens.add(token)
  saveTokens()
  return token
}

export function requireAdmin(req, res, next) {
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
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.slice(7)
  tokens.delete(token)
  saveTokens()
  res.json({ message: 'Logged out' })
}

export function loginHandler(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = generateToken()
  res.json({ token })
}
