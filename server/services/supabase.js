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

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing — using local file storage')
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ── Orders ──────────────────────────────────────────
let inMemoryOrders = readJSON(ORDERS_FILE, [])

function saveOrders() {
  writeJSON(ORDERS_FILE, inMemoryOrders)
}

export function getAllOrders() {
  return [...inMemoryOrders]
}

export function updateOrderStatus(id, status) {
  const order = inMemoryOrders.find(o => o.id === id)
  if (!order) return null
  order.status = status
  saveOrders()
  return order
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

export async function addMenuItem(item) {
  const menu = await loadLocalMenu()
  const newItem = { id: `c${Date.now()}`, ...item }
  menu.push(newItem)
  saveMenu()
  return newItem
}

export async function updateMenuItem(id, data) {
  const menu = await loadLocalMenu()
  const idx = menu.findIndex(i => i.id === id)
  if (idx === -1) return null
  menu[idx] = { ...menu[idx], ...data }
  saveMenu()
  return menu[idx]
}

export async function removeMenuItem(id) {
  const menu = await loadLocalMenu()
  const idx = menu.findIndex(i => i.id === id)
  if (idx === -1) return null
  const removed = menu.splice(idx, 1)[0]
  saveMenu()
  return removed
}

function getLocalMenu() {
  return inMemoryMenu
}

export async function getMenuItemById(id) {
  if (!inMemoryMenu) await loadLocalMenu()
  return inMemoryMenu ? (inMemoryMenu.find(i => i.id === id) || null) : null
}

export async function getMenu() {
  const local = getLocalMenu()
  if (local) return { data: local, error: null }

  if (!supabase) {
    const { menuItems } = await import('../../src/data/menu.js')
    return { data: menuItems, error: null }
  }
  try {
    const { data, error } = await supabase.from('menu').select('*').order('id')
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.warn('Supabase query failed, falling back to local menu:', err.message)
    const { menuItems } = await import('../../src/data/menu.js')
    return { data: menuItems, error: null }
  }
}

// ── Create Order ────────────────────────────────────
export async function createOrder(orderData) {
  if (!supabase) {
    const order = { id: Date.now().toString(), ...orderData, created_at: new Date().toISOString(), status: 'pending' }
    inMemoryOrders.unshift(order)
    saveOrders()
    return { data: order, error: null }
  }
  try {
    const { data, error } = await supabase.from('orders').insert({
      customer_name: orderData.customer_name,
      customer_contact: orderData.customer_contact,
      address: orderData.address,
      items: orderData.items,
      subtotal: orderData.subtotal,
      total: orderData.total,
      status: 'pending',
    }).select().single()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.warn('Supabase insert failed, falling back to file storage:', err.message)
    const order = { id: Date.now().toString(), ...orderData, created_at: new Date().toISOString(), status: 'pending' }
    inMemoryOrders.unshift(order)
    saveOrders()
    return { data: order, error: null }
  }
}