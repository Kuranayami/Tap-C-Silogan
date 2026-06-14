import { createHash, randomBytes } from 'crypto'
import { supabase, hasSupabase } from '../services/supabase.js'

export function requireCashier(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const token = header.slice(7)
  if (!hasSupabase) {
    return res.status(500).json({ error: 'Database required' })
  }
  supabase
    .from('cashiers')
    .select('id, name, status')
    .eq('id', token)
    .single()
    .then(({ data, error }) => {
      if (error || !data || (data.status === 'banned' || data.status === 'disabled')) {
        return res.status(401).json({ error: 'Invalid or disabled account' })
      }
      req.cashierId = data.id
      req.cashierName = data.name
      next()
    })
    .catch(() => res.status(500).json({ error: 'Auth check failed' }))
}
