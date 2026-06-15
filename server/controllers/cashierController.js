import { createHash } from 'crypto'
import { supabase, hasSupabase } from '../services/supabase.js'
import { cashierTokens } from '../services/tokenStore.js'

export async function loginCashier(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Database required' })
    }
    const hash = createHash('sha256').update(password).digest('hex')
    const { data, error } = await supabase
      .from('cashiers')
      .select('id, name, status')
      .eq('username', username)
      .eq('password_hash', hash)
      .single()

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    if (data.status === 'banned' || data.status === 'disabled') {
      return res.status(403).json({ error: 'Account is disabled' })
    }
    const token = cashierTokens.generate(data.id)
    res.json({ token, cashier: { id: data.id, name: data.name, status: data.status } })
  } catch (err) {
    console.error('loginCashier error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

export async function registerCashier(req, res) {
  try {
    const { name, username, password } = req.body
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Database required' })
    }
    const hash = createHash('sha256').update(password).digest('hex')
    const { data, error } = await supabase
      .from('cashiers')
      .insert({ name: name.trim(), username: username.trim().toLowerCase(), password_hash: hash })
      .select('id, name, username, status, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' })
      return res.status(500).json({ error: 'Registration failed' })
    }
    res.status(201).json({ cashier: data })
  } catch (err) {
    console.error('registerCashier error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
}

export async function getCashiers(req, res) {
  try {
    if (!hasSupabase) return res.json({ cashiers: [] })
    const { data, error } = await supabase
      .from('cashiers')
      .select('id, name, username, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ cashiers: data || [] })
  } catch (err) {
    console.error('getCashiers error:', err)
    res.status(500).json({ error: 'Failed to fetch cashiers' })
  }
}

export async function deleteCashier(req, res) {
  try {
    const { id } = req.params
    if (!hasSupabase) return res.status(500).json({ error: 'No database' })
    const { error } = await supabase.from('cashiers').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Cashier deleted' })
  } catch (err) {
    console.error('deleteCashier error:', err)
    res.status(500).json({ error: 'Failed to delete cashier' })
  }
}
