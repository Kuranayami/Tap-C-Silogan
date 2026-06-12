import { supabase, hasSupabase } from './supabase.js'

const CONFIG_KEY = 'site_config'

export async function getConfig() {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('config').select('value').eq('key', CONFIG_KEY).single()
      if (!error && data?.value) return data.value
    } catch (e) { console.warn('Config fetch failed:', e.message) }
  }
  return { heroImage: null, ratings: [] }
}

export async function updateConfig(updates) {
  const current = await getConfig()
  const merged = { ...current, ...updates }
  if (hasSupabase) {
    const { error } = await supabase.from('config').upsert({ key: CONFIG_KEY, value: merged }, { onConflict: 'key' })
    if (error) console.warn('Config save failed:', error.message)
  }
  return merged
}

export async function addRating({ name, rating, comment }) {
  const entry = { id: Date.now().toString(36), name, rating, comment, created_at: new Date().toISOString() }
  const cfg = await getConfig()
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
