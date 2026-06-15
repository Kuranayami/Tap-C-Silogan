import bcrypt from 'bcrypt'
import {
  getReadyOrders,
  claimOrder,
  getRiderActiveOrders,
  updateRiderStatus,
  markDelivered,
  getOnlineRiderCount,
  updateKitchenStatus,
  cancelDelivery,
  getRiderProfile,
} from '../services/rider.js'
import { supabase, hasSupabase } from '../services/supabase.js'
import { saveFile } from '../services/storage.js'
import { riderTokens } from '../services/tokenStore.js'

export async function loginRider(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    if (!hasSupabase) {
      return res.status(500).json({ error: 'Authentication requires database' })
    }

    const lookupPhone = (function(p){ let d=p.replace(/\D/g,''); if(d.startsWith('63'))d=d.slice(2); if(!d.startsWith('0'))d='0'+d; return d.slice(0,11); })(username)

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('phone', lookupPhone)
      .single()

    if (error || !data || !(await bcrypt.compare(password, data.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = riderTokens.generate(data.id)
    res.json({
      token,
      rider: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        status: data.status,
        total_deliveries: data.total_deliveries,
        rating: data.rating,
      },
    })
  } catch (err) {
    console.error('loginRider error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

export async function listReadyOrders(req, res) {
  try {
    if (req.riderStatus !== 'online') return res.json([])
    const orders = await getReadyOrders()
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ready orders' })
  }
}

export async function claimOrderHandler(req, res) {
  try {
    const { order_id } = req.body
    const riderId = req.riderId
    const riderName = req.riderName
    const riderStatus = req.riderStatus

    if (!order_id) return res.status(400).json({ error: 'order_id is required' })
    if (riderStatus !== 'online') return res.status(403).json({ error: 'You must be online to claim orders. Toggle your status to Online first.' })

    const order = await claimOrder(order_id, riderId, riderName)
    res.json({ message: 'Order claimed successfully', order })
  } catch (err) {
    console.error('claimOrder error:', err)
    res.status(409).json({ error: 'Failed to claim order' })
  }
}

export async function myActiveOrders(req, res) {
  try {
    const orders = await getRiderActiveOrders(req.riderId)
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

export async function completeDelivery(req, res) {
  try {
    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ error: 'order_id is required' })

    const order = await markDelivered(order_id, req.riderId)
    res.json({ message: 'Delivery completed', order })
  } catch (err) {
    console.error('completeDelivery error:', err)
    res.status(500).json({ error: 'Failed to complete delivery' })
  }
}

export async function setStatus(req, res) {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'Status is required' })

    const rider = await updateRiderStatus(req.riderId, status)
    res.json({ message: `Status set to ${status}`, rider })
  } catch (err) {
    console.error('setStatus error:', err)
    res.status(500).json({ error: 'Failed to update status' })
  }
}

export async function getRiderProfileHandler(req, res) {
  try {
    const profile = await getRiderProfile(req.riderId)
    if (!profile) return res.status(404).json({ error: 'Rider not found' })
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
}

export async function riderStatsHandler(req, res) {
  try {
    const stats = await getOnlineRiderCount()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rider stats' })
  }
}

export async function updateKitchen(req, res) {
  try {
    const { order_id, kitchen_status, packing_progress } = req.body
    if (!order_id || !kitchen_status) {
      return res.status(400).json({ error: 'order_id and kitchen_status are required' })
    }

    const order = await updateKitchenStatus(order_id, kitchen_status, packing_progress)
    res.json({ message: 'Kitchen status updated', order })
  } catch (err) {
    console.error('updateKitchen error:', err)
    res.status(500).json({ error: 'Failed to update kitchen status' })
  }
}

export async function cancelDeliveryHandler(req, res) {
  try {
    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ error: 'order_id is required' })

    const order = await cancelDelivery(order_id, req.riderId)
    res.json({ message: 'Delivery canceled', order })
  } catch (err) {
    console.error('cancelDelivery error:', err)
    res.status(500).json({ error: 'Failed to cancel delivery' })
  }
}

export async function updateRiderProfile(req, res) {
  try {
    const riderId = req.riderId
    const { name, phone, email, age, gender, maps_link, vehicle_type, license_plate } = req.body

    if (!hasSupabase) {
      return res.status(500).json({ error: 'Database required' })
    }

    const updates = {}
    if (name && name.trim()) updates.name = name.trim().slice(0, 100)
    if (phone) updates.phone = phone
    if (email !== undefined) updates.email = email?.trim().toLowerCase()
    if (age !== undefined && age !== '') updates.age = parseInt(age, 10)
    if (gender) updates.gender = gender
    if (maps_link !== undefined) {
      if (maps_link && !maps_link.startsWith('http://') && !maps_link.startsWith('https://')) {
        updates.maps_link = 'https://' + maps_link
      } else {
        updates.maps_link = maps_link
      }
    }
    if (vehicle_type) updates.vehicle_type = vehicle_type
    if (license_plate !== undefined) updates.license_plate = license_plate?.trim()

    if (req.file) {
      const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
      const ext = ALLOWED[req.file.mimetype]
      if (!ext) return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' })
      const filename = 'rider-avatar-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
      updates.avatar_url = await saveFile(filename, req.file.buffer, req.file.mimetype)
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    let { data, error } = await supabase
      .from('riders')
      .update(updates)
      .eq('id', riderId)
      .select('id, name, phone, email, avatar_url, status, total_deliveries, rating, vehicle_type, license_plate, age, gender, maps_link')
      .maybeSingle()

    if (error && (error.code === 'PGRST204' || error.code === '42703')) {
      const safeUpdates = { ...updates }
      delete safeUpdates.age
      delete safeUpdates.gender
      delete safeUpdates.maps_link
      const result = await supabase
        .from('riders')
        .update(safeUpdates)
        .eq('id', riderId)
        .select('id, name, phone, email, avatar_url, status, total_deliveries, rating, vehicle_type, license_plate')
        .single()
      if (result.error) throw result.error
      return res.json({ ...result.data, age: null, gender: null, maps_link: null })
    }

    if (error) throw error
    res.json(data)
  } catch (err) {
    console.error('updateRiderProfile error:', err)
    res.status(500).json({ error: 'Failed to update profile' })
  }
}

export async function registerRider(req, res) {
  try {
    const { name, phone, password, email, vehicle_type, license_plate } = req.body
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone, and password are required' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Registration requires database' })
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
      return res.status(500).json({ error: 'Registration failed' })
    }
    const regToken = riderTokens.generate(data.id)
    res.status(201).json({
      token: regToken,
      rider: {
        id: data.id, name: data.name, phone: data.phone, email: data.email,
        status: data.status, total_deliveries: 0, rating: 0,
      },
    })
  } catch (err) {
    console.error('registerRider error:', err)
    res.status(500).json({ error: 'Registration failed' })
  }
}
