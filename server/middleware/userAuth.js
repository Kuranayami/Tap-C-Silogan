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

  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, phone, email')
        .eq('token', token)
        .maybeSingle()

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid or expired token' })
      }

      req.userId = data.id
      req.user = data
      return next()
    } catch (e) {
      return res.status(500).json({ error: 'Auth check failed' })
    }
  }

  const userId = tokenStore.get(token)
  if (!userId) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.userId = userId
  req.user = { id: userId }
  next()
}
