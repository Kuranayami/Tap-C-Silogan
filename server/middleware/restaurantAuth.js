import { supabase, hasSupabase } from '../services/supabase.js'
import { restaurantTokens } from '../services/tokenStore.js'

export async function requireRestaurant(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.slice(7)
  if (!hasSupabase) {
    return res.status(500).json({ error: 'Database required' })
  }
  try {
    const restaurantId = restaurantTokens.lookup(token)
    if (!restaurantId) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, status')
      .eq('id', restaurantId)
      .single()
    if (error || !data || (data.status === 'banned' || data.status === 'disabled')) {
      restaurantTokens.revoke(token)
      return res.status(401).json({ error: 'Invalid or disabled account' })
    }
    req.restaurantId = data.id
    req.restaurantName = data.name
    next()
  } catch {
    res.status(500).json({ error: 'Auth check failed' })
  }
}