import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve, join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../.env') })

const dataDir = join(__dirname, '../data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

const ORDERS_FILE = join(dataDir, 'orders.json')
const MENU_FILE = join(dataDir, 'menu.json')
const ABOUT_FILE = join(dataDir, 'about.json')

function readJSON(file, fallback) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {}
  return fallback
}

function writeJSON(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const hasSupabase = supabaseUrl && supabaseKey
if (!hasSupabase) {
  console.warn('Supabase credentials missing — using local file storage')
}

export const supabase = hasSupabase ? createClient(supabaseUrl, supabaseKey) : null

// ── Orders ──────────────────────────────────────────
let inMemoryOrders = readJSON(ORDERS_FILE, [])

function saveOrders() {
  writeJSON(ORDERS_FILE, inMemoryOrders)
}

export async function getAllOrders() {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
      if (!error && data) return data
    } catch (e) { console.warn('Supabase orders fetch failed:', e.message) }
  }
  return [...inMemoryOrders]
}

export async function createOrder(orderData) {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('orders').insert({
        user_id: orderData.user_id || null,
        customer_name: orderData.customer_name,
        customer_contact: orderData.customer_contact,
        address: orderData.address,
        maps_link: orderData.maps_link || null,
        items: orderData.items,
        subtotal: orderData.subtotal,
        delivery_fee: orderData.delivery_fee || 0,
        total: orderData.total,
        status: 'pending',
      }).select().single()
      if (!error && data) return { data, error: null }
    } catch (e) { console.warn('Supabase insert failed:', e.message) }
  }
  const order = { id: Date.now().toString(), ...orderData, created_at: new Date().toISOString(), status: 'pending' }
  inMemoryOrders.unshift(order)
  saveOrders()
  return { data: order, error: null }
}

export async function updateOrderStatus(id, status) {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('orders').update({ status }).eq('id', id).select().single()
      if (!error && data) { inMemoryOrders = inMemoryOrders.map(o => o.id === id ? { ...o, status } : o); return data }
    } catch (e) { console.warn('Supabase status update failed:', e.message) }
  }
  const order = inMemoryOrders.find(o => o.id === id)
  if (!order) return null
  order.status = status
  saveOrders()
  return order
}

export async function getOrdersByContact(contact) {
  const clean = contact.replace(/\D/g, '').slice(0, 11)
  if (hasSupabase) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_contact', clean)
        .order('created_at', { ascending: false })
      if (!error && data) return data
    } catch (e) { console.warn('Supabase contact lookup failed:', e.message) }
  }
  return inMemoryOrders.filter(o => o.customer_contact === clean)
}

export async function deleteOrder(id) {
  if (hasSupabase) {
    try {
      const { data: result, error } = await supabase.from('orders').delete().eq('id', id).select().single()
      if (!error && result) return result
    } catch (e) { console.warn('Supabase order delete failed:', e.message) }
  }
  const idx = inMemoryOrders.findIndex(o => o.id === id)
  if (idx === -1) return null
  const removed = inMemoryOrders.splice(idx, 1)[0]
  saveOrders()
  return removed
}

// ── Menu ────────────────────────────────────────────
let inMemoryMenu = readJSON(MENU_FILE, null)

export async function ensureMenuLoaded() {
  if (!inMemoryMenu) await loadLocalMenu()
}

function saveMenu() {
  writeJSON(MENU_FILE, inMemoryMenu)
}

async function loadLocalMenu() {
  if (inMemoryMenu) return inMemoryMenu
  const { menuItems } = await import('../../src/data/menu.js')
  inMemoryMenu = [...menuItems]
  return inMemoryMenu
}

export async function getMenu() {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('menu').select('*').order('id')
      if (!error && data) return { data, error: null }
    } catch (e) { console.warn('Supabase query failed:', e.message) }
  }
  if (!inMemoryMenu) await loadLocalMenu()
  return { data: [...inMemoryMenu], error: null }
}

export async function addMenuItem(item) {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('menu').insert(item).select().single()
      if (!error && data) return data
    } catch (e) { console.warn('Supabase insert failed:', e.message) }
  }
  const menu = await loadLocalMenu()
  const newItem = { id: `c${Date.now()}`, ...item }
  menu.push(newItem)
  saveMenu()
  return newItem
}

export async function updateMenuItem(id, data) {
  if (hasSupabase) {
    try {
      const { data: result, error } = await supabase.from('menu').update(data).eq('id', id).select().single()
      if (!error && result) return result
    } catch (e) { console.warn('Supabase update failed:', e.message) }
  }
  const menu = await loadLocalMenu()
  const idx = menu.findIndex(i => i.id === id)
  if (idx === -1) return null
  menu[idx] = { ...menu[idx], ...data }
  saveMenu()
  return menu[idx]
}

export async function removeMenuItem(id) {
  if (hasSupabase) {
    try {
      const { data: result, error } = await supabase.from('menu').delete().eq('id', id).select().single()
      if (!error && result) return result
    } catch (e) { console.warn('Supabase delete failed:', e.message) }
  }
  const menu = await loadLocalMenu()
  const idx = menu.findIndex(i => i.id === id)
  if (idx === -1) return null
  const removed = menu.splice(idx, 1)[0]
  saveMenu()
  return removed
}

export async function getMenuItemById(id) {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('menu').select('*').eq('id', id).single()
      if (!error && data) return data
    } catch {}
  }
  if (!inMemoryMenu) await loadLocalMenu()
  return inMemoryMenu ? (inMemoryMenu.find(i => i.id === id) || null) : null
}

// ── About Images ────────────────────────────────────
let inMemoryAbout = readJSON(ABOUT_FILE, [])

function saveAbout() {
  writeJSON(ABOUT_FILE, inMemoryAbout)
}

export async function getAboutImages() {
  if (hasSupabase) {
    try {
      const { data, error } = await supabase.from('about_images').select('*').order('ord')
      if (!error && data) return data
    } catch (e) { console.warn('Supabase about query failed:', e.message) }
  }
  return [...inMemoryAbout]
}

export async function addAboutImage(item) {
  if (hasSupabase) {
    try {
      const { data: maxOrd } = await supabase.from('about_images').select('ord').order('ord', { ascending: false }).limit(1).maybeSingle()
      const ord = (maxOrd?.ord ?? -1) + 1
      const { data, error } = await supabase.from('about_images').insert({ ...item, ord }).select().single()
      if (!error && data) return data
    } catch (e) { console.warn('Supabase about insert failed:', e.message) }
  }
  const newItem = { id: `a${Date.now()}`, ...item, ord: inMemoryAbout.length }
  inMemoryAbout.push(newItem)
  saveAbout()
  return newItem
}

export async function removeAboutImage(id) {
  if (hasSupabase) {
    try {
      const { data: result, error } = await supabase.from('about_images').delete().eq('id', id).select().single()
      if (!error && result) return result
    } catch (e) { console.warn('Supabase about delete failed:', e.message) }
  }
  const idx = inMemoryAbout.findIndex(i => i.id === id)
  if (idx === -1) return null
  const removed = inMemoryAbout.splice(idx, 1)[0]
  saveAbout()
  return removed
}
