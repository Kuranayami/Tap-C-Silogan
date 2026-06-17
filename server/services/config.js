import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { supabase, hasSupabase } from './supabase.js'

const CONFIG_KEY = 'site_config'
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')
const LOCAL_PATH = join(DATA_DIR, 'config.json')

function readLocal() {
  try {
    if (existsSync(LOCAL_PATH)) return JSON.parse(readFileSync(LOCAL_PATH, 'utf-8'))
  } catch {}
  return null
}

function writeLocal(data) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch {}
}

export async function getConfig() {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('config').select('value').eq('key', CONFIG_KEY).single()
      if (!error && data?.value) return data.value
    } catch (e) { console.warn('Config fetch failed:', e.message) }
  }
  return readLocal() || { heroImage: null, ratings: [] }
}

export async function updateConfig(updates) {
  const current = await getConfig()
  const merged = { ...current, ...updates }
  if (hasSupabase) {
    const { error } = await supabase.from('config').upsert({ key: CONFIG_KEY, value: merged }, { onConflict: 'key' })
    if (!error) { writeLocal(merged); return merged }
    console.warn('Config save failed:', error.message)
  }
  writeLocal(merged)
  return merged
}

export async function addRating({ name, rating, comment }) {
  const cfg = await getConfig()
  const existing = (cfg.ratings || []).find(r => r.name === name)
  if (existing) {
    throw Object.assign(new Error('You have already submitted a rating'), { statusCode: 409 })
  }
  const entry = { id: Date.now().toString(36), name, rating, comment, created_at: new Date().toISOString() }
  const ratings = [...(cfg.ratings || []), entry]
  await updateConfig({ ratings })
  return entry
}

export async function getRatings() {
  const cfg = await getConfig()
  const ratings = cfg.ratings || []
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0
  return { ratings, average: Math.round(avg * 10) / 10, count: ratings.length }
}
