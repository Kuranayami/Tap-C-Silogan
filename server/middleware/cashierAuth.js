import { supabase, hasSupabase } from '../services/supabase.js'
import { cashierTokens } from '../services/tokenStore.js'

export async function requireCashier(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.slice(7)
  if (!hasSupabase) {
    return res.status(500).json({ error: 'Database required' })
  }
  try {
    const cashierId = cashierTokens.lookup(token)
    if (!cashierId) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    const { data, error } = await supabase
      .from('cashiers')
      .select('id, name, status')
      .eq('id', cashierId)
      .single()
    if (error || !data || (data.status === 'banned' || data.status === 'disabled')) {
      cashierTokens.revoke(token)
      return res.status(401).json({ error: 'Invalid or disabled account' })
    }
    req.cashierId = data.id
    req.cashierName = data.name
    next()
  } catch {
    res.status(500).json({ error: 'Auth check failed' })
  }
}
