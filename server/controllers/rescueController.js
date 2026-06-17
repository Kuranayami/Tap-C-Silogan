import {
  getActiveRescueHolds, getRescueLogs, getRescueStats,
  getNotificationPrefs, setNotificationPref,
  updateDriverLocation, getDriverLocation,
  claimRescueMatch, createRescueHold,
} from '../services/rescue.js'
import { getAllOrders } from '../services/supabase.js'

export async function getRescueHoldsHandler(req, res) {
  try {
    const holds = await getActiveRescueHolds()
    res.json(holds)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rescue holds' })
  }
}

export async function getRescueLogsHandler(req, res) {
  try {
    const logs = await getRescueLogs()
    res.json(logs)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rescue logs' })
  }
}

export async function getRescueStatsHandler(req, res) {
  try {
    const stats = await getRescueStats()
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rescue stats' })
  }
}

export async function getNotificationPrefsHandler(req, res) {
  try {
    const { targetType, targetId } = req.query
    const prefs = await getNotificationPrefs(targetType, targetId)
    res.json(prefs)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification prefs' })
  }
}

export async function updateNotificationPrefsHandler(req, res) {
  try {
    const { targetType, targetId, channel, enabled } = req.body
    await setNotificationPref(targetType, targetId, channel, enabled)
    res.json({ message: 'Notification preference updated' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update notification prefs' })
  }
}

export async function updateDriverLocationHandler(req, res) {
  try {
    const { order_id, lat, lng, heading, speed } = req.body
    const riderId = req.riderId

    if (!order_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'order_id, lat, and lng required' })
    }

    const loc = await updateDriverLocation(riderId, order_id, lat, lng, heading, speed)
    res.json({ message: 'Location updated', location: loc })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update location' })
  }
}

export async function getDriverLocationHandler(req, res) {
  try {
    const { order_id } = req.params
    const loc = await getDriverLocation(order_id)
    res.json(loc || { error: 'No location found' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch driver location' })
  }
}

export async function forceRescueHoldHandler(req, res) {
  try {
    const { order_id } = req.body
    const orders = await getAllOrders()
    const order = orders.find(o => String(o.id) === String(order_id))
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const hold = await createRescueHold(order)
    if (!hold) return res.status(500).json({ error: 'Failed to create rescue hold' })

    res.json({ message: 'Rescue hold created', hold })
  } catch (err) {
    res.status(500).json({ error: 'Failed to create rescue hold' })
  }
}

export async function claimRescueMatchHandler(req, res) {
  try {
    const { hold_id, matched_order_id, matched_items } = req.body
    const result = await claimRescueMatch(hold_id, matched_order_id, matched_items)
    if (!result) return res.status(409).json({ error: 'Hold already claimed or expired' })
    res.json({ message: 'Rescue match claimed', hold: result })
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim rescue match' })
  }
}
