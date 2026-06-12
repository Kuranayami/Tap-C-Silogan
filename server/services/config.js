import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import { config as dotenv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv({ path: resolve(__dirname, '../../.env') })

const dataDir = join(__dirname, '../data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
const CONFIG_FILE = join(dataDir, 'config.json')

let cached = null

function read() {
  try {
    if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'))
  } catch {}
  return { heroImage: null, ratings: [] }
}

function write(data) {
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export function getConfig() {
  if (!cached) cached = read()
  return { ...cached }
}

export function updateConfig(updates) {
  cached = { ...getConfig(), ...updates }
  write(cached)
  return { ...cached }
}

export function addRating({ name, rating, comment }) {
  const cfg = getConfig()
  const entry = { id: Date.now().toString(36), name, rating, comment, created_at: new Date().toISOString() }
  cfg.ratings.push(entry)
  cached = cfg
  write(cfg)
  return entry
}

export function getRatings() {
  const cfg = getConfig()
  const ratings = cfg.ratings || []
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0
  return { ratings, average: Math.round(avg * 10) / 10, count: ratings.length }
}
