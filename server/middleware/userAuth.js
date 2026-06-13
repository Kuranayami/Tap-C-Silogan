import { supabase, hasSupabase } from '../services/supabase.js'

const tokenCache = new Map()

export async function storeToken(token, userId) {
  tokenCache.set(token, userId)

  if (hasSupabase) {
    try {
      await supabase.from('user_tokens').upsert(
        { token, user_id: userId },
        { onConflict: 'token' }
      )
    } catch {
      // table may not exist yet
    }
  }
}

export async function requireUser(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const token = header.slice(7)

  // Check in-memory cache first
  const cachedUserId = tokenCache.get(token)
  if (cachedUserId) {
    req.userId = cachedUserId
    req.user = { id: cachedUserId }
    return next()
  }

  // Fallback to Supabase lookup
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from('user_tokens')
        .select('user_id')
        .eq('token', token)
        .maybeSingle()

      if (!error && data) {
        tokenCache.set(token, data.user_id)
        req.userId = data.user_id
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, phone, email')
          .eq('id', data.user_id)
          .maybeSingle()
        req.user = userData || { id: data.user_id }
        return next()
      }
    } catch {
      // fall through
    }
  }

  return res.status(401).json({ error: 'Invalid or expired token' })
}
