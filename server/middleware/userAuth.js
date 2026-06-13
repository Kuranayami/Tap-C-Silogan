import { supabase, hasSupabase } from '../services/supabase.js'

const tokenStore = new Map()

export function storeToken(token, userId) {
  tokenStore.set(token, userId)
}

export async function requireUser(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = header.slice(7)

  // Check in-memory store first
  const localUserId = tokenStore.get(token)
  if (localUserId) {
    req.userId = localUserId
    req.user = { id: localUserId }
    return next()
  }

  // Fallback to Supabase lookup
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('id', token)
        .maybeSingle()

      if (!error && data) {
        req.userId = data.id
        req.user = data
        return next()
      }
    } catch (e) {
      // fall through
    }
  }

  return res.status(401).json({ error: 'Invalid or expired token' })
}
