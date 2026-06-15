import { riderTokens } from '../services/tokenStore.js'
import { supabase, hasSupabase } from '../services/supabase.js'

export async function requireRider(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!hasSupabase) {
    return res.status(500).json({ error: 'Authentication requires database' })
  }

  try {
    const token = header.slice(7)
    const riderId = riderTokens.lookup(token)
    if (!riderId) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    const { data, error } = await supabase
      .from('riders')
      .select('id, name, status')
      .eq('id', riderId)
      .single()

    if (error || !data) {
      riderTokens.revoke(token)
      return res.status(401).json({ error: 'Rider not found' })
    }

    if (data.status === 'banned' || data.status === 'disabled') {
      riderTokens.revoke(token)
      return res.status(401).json({ error: 'Account is banned or disabled' })
    }

    req.riderId = data.id
    req.riderName = data.name
    req.riderStatus = data.status
    next()
  } catch {
    res.status(500).json({ error: 'Auth check failed' })
  }
}
