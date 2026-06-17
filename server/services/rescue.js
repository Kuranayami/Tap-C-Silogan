import { supabase, hasSupabase } from './supabase.js'

const DEFAULT_HOLD_MINUTES = 15

function itemMatchKey(item) {
  return `${item.name}_${item.price}`
}

export function getRescueHoldMinutes() {
  return parseInt(process.env.RESCUE_HOLD_MINUTES, 10) || DEFAULT_HOLD_MINUTES
}

// ── Rescue Holds ──────────────────────────────────

export async function createRescueHold(order) {
  if (!hasSupabase) return null

  const holdUntil = new Date(Date.now() + getRescueHoldMinutes() * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('rescue_holds')
    .insert({
      order_id: order.id,
      items: order.items,
      reason: 'cancellation',
      status: 'available',
      hold_until: holdUntil,
    })
    .select()
    .single()

  if (error) {
    console.warn('Failed to create rescue hold:', error.message)
    return null
  }

  await logRescueAction('hold_created', {
    order_id: order.id,
    hold_id: data.id,
    items: order.items,
    hold_until: holdUntil,
  }, 'system')

  return data
}

export async function findMatchingRescue(items) {
  if (!hasSupabase) return null

  const now = new Date().toISOString()

  const { data: holds, error } = await supabase
    .from('rescue_holds')
    .select('*, orders!inner(*)')
    .eq('status', 'available')
    .gt('hold_until', now)
    .order('created_at', { ascending: true })

  if (error || !holds || holds.length === 0) return null

  const orderItemKeys = items.map(itemMatchKey)

  for (const hold of holds) {
    const holdItems = hold.items || []
    const holdKeys = holdItems.map(itemMatchKey)
    const matchKeys = orderItemKeys.filter(k => holdKeys.includes(k))
    if (matchKeys.length > 0) {
      const matchedItem = holdItems.find(i => orderItemKeys.includes(itemMatchKey(i)))
      return {
        hold,
        matchedItems: holdItems.filter(i => orderItemKeys.includes(itemMatchKey(i))),
        order: hold.orders,
      }
    }
  }

  return null
}

export async function claimRescueMatch(holdId, matchedOrderId, matchedItems) {
  if (!hasSupabase) return null

  const { data, error } = await supabase
    .from('rescue_holds')
    .update({
      status: 'matched',
      matched_order_id: matchedOrderId,
    })
    .eq('id', holdId)
    .eq('status', 'available')
    .select()
    .single()

  if (error) return null

  for (const item of matchedItems) {
    await supabase
      .from('rescue_matches')
      .insert({
        hold_id: holdId,
        source_order_id: data.order_id,
        matched_order_id: matchedOrderId,
        matched_item_name: item.name,
        matched_item_qty: item.quantity || 1,
      })
  }

  await supabase
    .from('orders')
    .update({ is_rescue: true, express_badge: true })
    .eq('id', matchedOrderId)

  await supabase
    .from('orders')
    .update({ express_badge: true })
    .eq('id', data.order_id)

  await logRescueAction('rescue_matched', {
    hold_id: holdId,
    source_order_id: data.order_id,
    matched_order_id: matchedOrderId,
    items: matchedItems,
  }, 'system')

  return data
}

export async function expireRescueHolds() {
  if (!hasSupabase) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('rescue_holds')
    .update({ status: 'expired' })
    .eq('status', 'available')
    .lt('hold_until', now)
    .select()

  if (error) return []

  for (const hold of data || []) {
    await logRescueAction('hold_expired', {
      hold_id: hold.id,
      order_id: hold.order_id,
    }, 'system')
  }

  return data || []
}

export async function getActiveRescueHolds() {
  if (!hasSupabase) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('rescue_holds')
    .select('*, orders!inner(*)')
    .eq('status', 'available')
    .gt('hold_until', now)
    .order('created_at', { ascending: false })

  if (error) return []
  return data || []
}

// ── Auto-Refund ──────────────────────────────────

export async function processAutoRefund(order, reason = 'cancellation') {
  if (!hasSupabase) return null

  const refundAmount = parseFloat(order.total) || 0

  const { data, error } = await supabase
    .from('refunds')
    .insert({
      order_id: order.id,
      user_id: order.user_id || null,
      amount: refundAmount,
      reason,
      status: 'completed',
      processed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.warn('Auto-refund failed:', error.message)
    return null
  }

  await supabase
    .from('orders')
    .update({ refund_amount: refundAmount, refund_status: 'completed' })
    .eq('id', order.id)

  await logRescueAction('refund_processed', {
    order_id: order.id,
    amount: refundAmount,
    reason,
  }, 'system')

  return data
}

// ── Driver Location Tracking ─────────────────────

export async function updateDriverLocation(riderId, orderId, lat, lng, heading, speed) {
  if (!hasSupabase) return null

  const { data, error } = await supabase
    .from('driver_locations')
    .upsert({
      rider_id: riderId,
      order_id: orderId,
      lat,
      lng,
      heading: heading || null,
      speed: speed || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'rider_id, order_id',
      ignoreDuplicates: false,
    })
    .select()
    .single()

  if (error) return null
  return data
}

export async function getDriverLocation(orderId) {
  if (!hasSupabase) return null

  const { data, error } = await supabase
    .from('driver_locations')
    .select('*, riders!inner(name, phone, vehicle_type)')
    .eq('order_id', orderId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return null
  return data
}

// ── Earnings ─────────────────────────────────────

export async function addRiderEarnings(riderId, amount) {
  if (!hasSupabase) return

  const { data: rider } = await supabase
    .from('riders')
    .select('total_earnings, pending_earnings')
    .eq('id', riderId)
    .single()

  if (rider) {
    await supabase
      .from('riders')
      .update({
        total_earnings: (parseFloat(rider.total_earnings) || 0) + amount,
        pending_earnings: (parseFloat(rider.pending_earnings) || 0) + amount,
      })
      .eq('id', riderId)
  }
}

// ── Rescue Logs ──────────────────────────────────

async function logRescueAction(action, details, actorType, actorId) {
  if (!hasSupabase) return

  try {
    await supabase
      .from('rescue_logs')
      .insert({
        action,
        details,
        actor_type: actorType,
        actor_id: actorId || null,
      })
  } catch {}
}

export async function getRescueLogs(limit = 50) {
  if (!hasSupabase) return []

  const { data, error } = await supabase
    .from('rescue_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data || []
}

export async function getRescueStats() {
  if (!hasSupabase) {
    return { totalHolds: 0, totalMatches: 0, totalRefunds: 0, activeHolds: 0 }
  }

  const now = new Date().toISOString()

  const [{ count: totalHolds }, { count: totalMatches }, { count: totalRefunds }, { count: activeHolds }] =
    await Promise.all([
      supabase.from('rescue_holds').select('*', { count: 'exact', head: true }),
      supabase.from('rescue_matches').select('*', { count: 'exact', head: true }),
      supabase.from('refunds').select('*', { count: 'exact', head: true }),
      supabase.from('rescue_holds').select('*', { count: 'exact', head: true }).eq('status', 'available').gt('hold_until', now),
    ])

  return {
    totalHolds: totalHolds || 0,
    totalMatches: totalMatches || 0,
    totalRefunds: totalRefunds || 0,
    activeHolds: activeHolds || 0,
  }
}

// ── Notification Preferences ─────────────────────

export async function getNotificationPrefs(targetType, targetId) {
  if (!hasSupabase) return { push: true, sms: true, email: true }

  const { data, error } = await supabase
    .from('notification_prefs')
    .select('channel, enabled')
    .eq('target_type', targetType)
    .eq('target_id', String(targetId))

  if (error) return { push: true, sms: true, email: true }

  const prefs = { push: true, sms: true, email: true }
  for (const row of data || []) {
    prefs[row.channel] = row.enabled
  }
  return prefs
}

export async function setNotificationPref(targetType, targetId, channel, enabled) {
  if (!hasSupabase) return

  await supabase
    .from('notification_prefs')
    .upsert({
      target_type: targetType,
      target_id: String(targetId),
      channel,
      enabled,
    }, { onConflict: 'target_type, target_id, channel' })
}

// ── Rescue Timer (recurring cleanup) ─────────────

let rescueTimerInterval = null

export function startRescueTimer() {
  if (rescueTimerInterval) return

  const checkInterval = 60 * 1000

  rescueTimerInterval = setInterval(async () => {
    try {
      const expired = await expireRescueHolds()
      if (expired.length > 0) {
        for (const hold of expired) {
          await processAutoRefund(
            { id: hold.order_id, total: 0, user_id: null },
            'rescue_failed'
          )
        }
      }
    } catch (err) {
      console.warn('Rescue timer check failed:', err.message)
    }
  }, checkInterval)

  console.log(`[rescue] Timer started (check every ${checkInterval / 1000}s)`)
}

export function stopRescueTimer() {
  if (rescueTimerInterval) {
    clearInterval(rescueTimerInterval)
    rescueTimerInterval = null
  }
}
