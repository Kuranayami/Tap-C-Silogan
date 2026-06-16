import bcrypt from 'bcrypt'
import { supabase, hasSupabase } from '../services/supabase.js'
import { saveFile } from '../services/storage.js'

export async function getUsers(req, res) {
  try {
    if (!hasSupabase) {
      return res.json({ users: [] })
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, auth_provider, is_verified, created_at, google_id, avatar_url')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ users: data || [] })
  } catch (err) {
    console.error('getUsers error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
}

export async function updateUserStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['active', 'banned', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Use: active, banned, or disabled' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id)
      .select('id, name, email, phone, auth_provider, status, is_verified, created_at')
      .maybeSingle()

    if (error) {
      if (error.code === '42703') {
        return res.status(400).json({ error: 'User status feature not available — run migration 004_add_user_status.sql in Supabase SQL Editor' })
      }
      throw error
    }
    res.json({ user: data, message: `User ${status}` })
  } catch (err) {
    console.error('updateUserStatus error:', err)
    res.status(500).json({ error: 'Failed to update user status' })
  }
}

export async function deleteUser(req, res) {
  try {
    const { id } = req.params
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'User deleted' })
  } catch (err) {
    console.error('deleteUser error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
}

// ── Rider Management ──

export async function getRiders(req, res) {
  try {
    if (!hasSupabase) {
      return res.json({ riders: [] })
    }
    const { data, error } = await supabase
      .from('riders')
      .select('id, name, phone, email, vehicle_type, license_plate, status, total_deliveries, rating, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json({ riders: data || [] })
  } catch (err) {
    console.error('getRiders error:', err)
    res.status(500).json({ error: 'Failed to fetch riders' })
  }
}

export async function updateRiderStatus(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['active', 'online', 'idle', 'offline', 'banned', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { data, error } = await supabase
      .from('riders')
      .update({ status })
      .eq('id', id)
      .select('id, name, phone, email, vehicle_type, license_plate, status, total_deliveries, rating')
      .single()

    if (error) throw error
    res.json({ rider: data, message: `Rider ${status}` })
  } catch (err) {
    console.error('updateRiderStatus error:', err)
    res.status(500).json({ error: 'Failed to update rider status' })
  }
}

export async function deleteRider(req, res) {
  try {
    const { id } = req.params
    if (!hasSupabase) {
      return res.status(500).json({ error: 'No database' })
    }
    const { error } = await supabase.from('riders').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Rider deleted' })
  } catch (err) {
    console.error('deleteRider error:', err)
    res.status(500).json({ error: 'Failed to delete rider' })
  }
}

// ── Restaurant Management ──

export async function getRestaurants(req, res) {
  try {
    if (!hasSupabase) return res.json({ restaurants: [] })
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, username, status, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ restaurants: data || [] })
  } catch (err) {
    console.error('getRestaurants error:', err)
    res.status(500).json({ error: 'Failed to fetch restaurants' })
  }
}

export async function createRestaurant(req, res) {
  try {
    const { name, username, password } = req.body
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' })
    }
    if (!hasSupabase) return res.status(500).json({ error: 'Database required' })
    const hash = await bcrypt.hash(password, 10)
    const { data, error } = await supabase
      .from('restaurants')
      .insert({ name: name.trim(), username: username.trim().toLowerCase(), password_hash: hash })
      .select('id, name, username, status, created_at')
      .single()
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Username already taken' })
      return res.status(500).json({ error: 'Failed to create restaurant' })
    }
    res.status(201).json({ restaurant: data })
  } catch (err) {
    console.error('createRestaurant error:', err)
    res.status(500).json({ error: 'Failed to create restaurant' })
  }
}

export async function deleteRestaurant(req, res) {
  try {
    const { id } = req.params
    if (!hasSupabase) return res.status(500).json({ error: 'No database' })
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) throw error
    res.json({ message: 'Restaurant deleted' })
  } catch (err) {
    console.error('deleteRestaurant error:', err)
    res.status(500).json({ error: 'Failed to delete restaurant' })
  }
}

export async function createRider(req, res) {
  try {
    const { name, phone, password, email, vehicle_type, license_plate } = req.body
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Database required' })
    }
    const cleanPhone = (function(p){ let d=p.replace(/\D/g,''); if(d.startsWith('63'))d=d.slice(2); if(!d.startsWith('0'))d='0'+d; return d.slice(0,11); })(phone)
    const hash = await bcrypt.hash(password, 10)

    let avatarUrl = null
    if (req.file) {
      const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
      const ext = ALLOWED[req.file.mimetype]
      if (!ext) return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' })
      const filename = 'rider-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
      avatarUrl = await saveFile(filename, req.file.buffer, req.file.mimetype)
    }

    const insertData = {
      name: name.trim(),
      phone: cleanPhone,
      password_hash: hash,
      status: 'online',
    }
    if (email) insertData.email = email.trim().toLowerCase()
    if (vehicle_type) insertData.vehicle_type = vehicle_type
    if (license_plate) insertData.license_plate = license_plate.trim()
    if (avatarUrl) insertData.avatar_url = avatarUrl

    const { data, error } = await supabase
      .from('riders')
      .insert(insertData)
      .select()
      .single()
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Phone number already registered' })
      return res.status(500).json({ error: 'Failed to create rider' })
    }
    res.status(201).json({ rider: data, message: 'Rider created successfully' })
  } catch (err) {
    console.error('createRider error:', err)
    res.status(500).json({ error: 'Failed to create rider' })
  }
}
