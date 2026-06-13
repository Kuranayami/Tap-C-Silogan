import { randomUUID, createHash } from 'crypto'
import {
  getReadyOrders,
  claimOrder,
  getRiderActiveOrders,
  updateRiderStatus,
  markDelivered,
  getOnlineRiderCount,
  updateKitchenStatus,
} from '../services/rider.js'
import { supabase, hasSupabase } from '../services/supabase.js'

export async function loginRider(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    if (!hasSupabase) {
      return res.status(500).json({ error: 'Authentication requires database' })
    }

    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('phone', username)
      .single()

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const hash = createHash('sha256').update(password).digest('hex')
    if (data.password_hash !== hash) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = randomUUID()

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

    if (!order_id) return res.status(400).json({ error: 'order_id is required' })

    const order = await claimOrder(order_id, riderId, riderName)
    res.json({ message: 'Order claimed successfully', order })
  } catch (err) {
    res.status(409).json({ error: err.message || 'Failed to claim order' })
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
    res.status(500).json({ error: err.message || 'Failed to complete delivery' })
  }
}

export async function setStatus(req, res) {
  try {
    const { status } = req.body
    if (!status) return res.status(400).json({ error: 'Status is required' })

    const rider = await updateRiderStatus(req.riderId, status)
    res.json({ message: `Status set to ${status}`, rider })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update status' })
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
    res.status(500).json({ error: err.message || 'Failed to update kitchen status' })
  }
}
