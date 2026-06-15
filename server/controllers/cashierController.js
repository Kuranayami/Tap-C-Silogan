import { createHash } from 'crypto'
import { supabase, hasSupabase } from '../services/supabase.js'
import { cashierTokens } from '../services/tokenStore.js'
import { saveFile } from '../services/storage.js'
import { updateOrderStatus } from '../services/supabase.js'

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

export async function getCashierProfile(req, res) {
  try {
    const cashierId = req.cashierId
    if (!hasSupabase) return res.status(500).json({ error: 'Database required' })

    const { data, error } = await supabase
      .from('cashiers')
      .select('*')
      .eq('id', cashierId)
      .single()

    if (error) return res.status(404).json({ error: 'Cashier not found' })
    res.json({
      id: data.id, name: data.name, username: data.username,
      status: data.status, created_at: data.created_at,
      phone: data.phone, avatar_url: data.avatar_url,
      age: data.age, gender: data.gender, maps_link: data.maps_link,
    })
  } catch (err) {
    console.error('getCashierProfile error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

export async function updateCashierProfile(req, res) {
  try {
    const cashierId = req.cashierId
    const { name, phone, age, gender, maps_link } = req.body

    if (!hasSupabase) return res.status(500).json({ error: 'Database required' })

    const updates = {}
    if (name && name.trim()) updates.name = name.trim().slice(0, 100)
    if (phone) updates.phone = phone
    if (age !== undefined && age !== '') updates.age = parseInt(age, 10)
    if (gender) updates.gender = gender
    if (maps_link !== undefined) updates.maps_link = maps_link

    if (req.file) {
      const ext = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[req.file.mimetype] || '.bin'
      const filename = 'cashier-avatar-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
      updates.avatar_url = await saveFile(filename, req.file.buffer, req.file.mimetype)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    let { data, error } = await supabase
      .from('cashiers')
      .update(updates)
      .eq('id', cashierId)
      .select('id, name, username, status, phone, avatar_url, age, gender, maps_link')
      .maybeSingle()

    if (error && (error.code === 'PGRST204' || error.code === '42703')) {
      const safeUpdates = { ...updates }
      delete safeUpdates.age
      delete safeUpdates.gender
      delete safeUpdates.maps_link
      delete safeUpdates.phone
      delete safeUpdates.avatar_url
      const result = await supabase
        .from('cashiers')
        .update(safeUpdates)
        .eq('id', cashierId)
        .select('id, name, username, status')
        .single()
      if (result.error) throw result.error
      return res.json({ ...result.data, phone: null, avatar_url: null, age: null, gender: null, maps_link: null })
    }

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('updateCashierProfile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
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

export async function cashierUpdateOrder(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    const ALLOWED = ['ongoing', 'canceled']
    if (!status || !ALLOWED.includes(status.toLowerCase())) {
      return res.status(403).json({ error: 'Cashier can only accept (ongoing) or cancel orders' })
    }

    const order = await updateOrderStatus(id, status.toLowerCase())
    if (!order) return res.status(404).json({ error: 'Order not found' })

    res.json(order)
  } catch (err) {
    console.error('cashierUpdateOrder error:', err)
    res.status(500).json({ error: 'Failed to update order' })
  }
}
