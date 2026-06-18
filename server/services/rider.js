import { supabase, hasSupabase } from './supabase.js'
import { createRescueHold } from './rescue.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RIDERS_FILE = join(__dirname, '../data/riders.json')

let inMemoryRiders = []

function loadRiders() {
  if (existsSync(RIDERS_FILE)) {
    try {
      inMemoryRiders = JSON.parse(readFileSync(RIDERS_FILE, 'utf-8'))
    } catch { inMemoryRiders = [] }
  }
}

function saveRiders() {
  writeFileSync(RIDERS_FILE, JSON.stringify(inMemoryRiders, null, 2), 'utf-8')
}

loadRiders()

export async function getReadyOrders() {
  const all = []

  if (hasSupabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'in_delivery')
      .is('rider_id', null)
      .order('created_at', { ascending: true })

    if (!error && data) all.push(...data)
  }

  return all
}

export async function getRescueAlerts() {
  if (!hasSupabase) return []

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('rescue_holds')
    .select('*, orders!inner(*)')
    .eq('status', 'available')
    .gt('hold_until', now)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return []
  return data || []
}

export async function claimOrder(orderId, riderId, riderName) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        rider_id: riderId,
        rider_name: riderName,
        status: 'in_delivery',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .is('rider_id', null)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Order already claimed by another rider')
      throw new Error('Failed to claim order: ' + error.message)
    }

    const { data: riderData } = await supabase
      .from('riders')
      .select('total_deliveries')
      .eq('id', riderId)
      .single()
    const newCount = (riderData?.total_deliveries || 0) + 1
    await supabase
      .from('riders')
      .update({ status: 'busy', total_deliveries: newCount })
      .eq('id', riderId)

    return data
  }

  throw new Error('Claiming requires Supabase')
}

export async function getRiderProfile(riderId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', riderId)
      .single()

    if (error) return null
    return data
  }

  return inMemoryRiders.find(r => r.id === riderId) || null
}

export async function updateRiderStatus(riderId, status) {
  const valid = ['online', 'busy', 'idle', 'offline']
  if (!valid.includes(status)) throw new Error('Invalid rider status')

  if (hasSupabase) {
    const { data, error } = await supabase
      .from('riders')
      .update({ status })
      .eq('id', riderId)
      .select()
      .single()

    if (error) throw new Error('Failed to update status: ' + error.message)
    return data
  }

  const rider = inMemoryRiders.find(r => r.id === riderId)
  if (rider) {
    rider.status = status
    rider.last_ping_at = new Date().toISOString()
    saveRiders()
  }
  return rider
}

export async function getRiderActiveOrders(riderId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('rider_id', riderId)
      .in('status', ['in_delivery'])
      .order('claimed_at', { ascending: false })

    if (!error && data) return data
  }

  return []
}

export async function markDelivered(orderId, riderId) {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'done',
        delivered_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('rider_id', riderId)
      .select()
      .single()

    if (error) throw new Error('Failed to mark delivered: ' + error.message)

    await supabase
      .from('riders')
      .update({ status: 'online' })
      .eq('id', riderId)

    return data
  }

  throw new Error('Requires Supabase')
}

export async function getOnlineRiderCount() {
  if (hasSupabase) {
    const { data, error } = await supabase
      .from('riders')
      .select('id, status')
      .in('status', ['online', 'idle', 'busy'])

    if (!error && data) {
      return {
        online: data.filter(r => r.status === 'online').length,
        busy: data.filter(r => r.status === 'busy').length,
        idle: data.filter(r => r.status === 'idle').length,
        total: data.length,
      }
    }
  }

  return { online: 0, busy: 0, idle: 0, total: 0 }
}

export async function cancelDelivery(orderId, riderId) {
  if (hasSupabase) {
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    if (fetchErr) throw new Error('Order not found: ' + fetchErr.message)

    const CANCELABLE = ['in_delivery', 'pending', 'ongoing', 'ready_for_pickup']
    if (!CANCELABLE.includes(order.status)) {
      throw new Error('Order cannot be canceled in its current state')
    }

    const { data, error } = await supabase
      .from('orders')
      .update({
        status: 'canceled',
        rider_id: null,
        rider_name: null,
      })
      .eq('id', orderId)
      .eq('rider_id', riderId)
      .select()
      .single()

    if (error) throw new Error('Failed to cancel delivery: ' + error.message)

    await supabase
      .from('riders')
      .update({ status: 'online' })
      .eq('id', riderId)

    // Put items into rescue so another customer can claim them
    if (order.status === 'in_delivery') {
      await createRescueHold(order)
    }

    return data
  }

  throw new Error('Requires Supabase')
}

export async function updateKitchenStatus(orderId, status, progress) {
  const valid = ['pending', 'preparing', 'packing', 'ready']
  if (!valid.includes(status)) throw new Error('Invalid kitchen status')

  if (hasSupabase) {
    const updateData = { kitchen_status: status }
    if (progress !== undefined) updateData.packing_progress = progress
    if (status === 'ready') updateData.status = 'ready_for_pickup'

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw new Error('Failed to update kitchen status: ' + error.message)
    return data
  }

  return null
}
