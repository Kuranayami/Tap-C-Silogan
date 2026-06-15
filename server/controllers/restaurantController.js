import bcrypt from 'bcrypt'
import { supabase, hasSupabase } from '../services/supabase.js'
import { restaurantTokens } from '../services/tokenStore.js'
import { updateOrderStatus } from '../services/supabase.js'

export async function loginRestaurant(req, res) {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }
    if (!hasSupabase) {
      return res.status(500).json({ error: 'Database required' })
    }
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, status, password_hash')
      .eq('username', username)
      .single()

    if (error || !data || !(await bcrypt.compare(password, data.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }
    if (data.status === 'banned' || data.status === 'disabled') {
      return res.status(403).json({ error: 'Account is disabled' })
    }
    const token = restaurantTokens.generate(data.id)
    res.json({ token, restaurant: { id: data.id, name: data.name, status: data.status } })
  } catch (err) {
    console.error('loginRestaurant error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
}

export async function getRestaurantOrders(req, res) {
  try {
    if (!hasSupabase) return res.json([])
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'ongoing', 'in_delivery'])
      .order('created_at', { ascending: false })

    if (error) throw error
    res.json(data || [])
  } catch (err) {
    console.error('getRestaurantOrders error:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

export async function markOrderReady(req, res) {
  try {
    const { id } = req.params
    const order = await updateOrderStatus(id, 'in_delivery')
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  } catch (err) {
    console.error('markOrderReady error:', err)
    res.status(500).json({ error: 'Failed to mark order as ready' })
  }
}