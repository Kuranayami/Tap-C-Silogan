import { createOrder, getAllOrders, updateOrderStatus, deleteOrder, getMenuItemById, ensureMenuLoaded, getOrdersByContact, getOrdersByUser } from '../services/supabase.js'
import { createRescueHold, processAutoRefund, findMatchingRescue, claimRescueMatch } from '../services/rescue.js'

const VALID_ADDON_IDS = ['extra-rice', 'egg', 'mang-tomas']
const MAX_ITEMS_PER_ORDER = 50
const MAX_ADDONS_PER_ITEM = 5

function validateCart(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'Cart must contain at least one item'
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    return `Maximum ${MAX_ITEMS_PER_ORDER} items per order`
  }
  for (const item of items) {
    if (!item.id || !item.name) {
      return 'Each item must have id and name'
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      return 'Item price must be a non-negative number'
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return 'Item quantity must be a positive whole number'
    }
    if (item.addons && Array.isArray(item.addons)) {
      if (item.addons.length > MAX_ADDONS_PER_ITEM) {
        return `Maximum ${MAX_ADDONS_PER_ITEM} add-ons per item`
      }
      for (const addon of item.addons) {
        if (!VALID_ADDON_IDS.includes(addon.id)) {
          return `Invalid add-on: ${addon.id}`
        }
        if (typeof addon.price !== 'number' || addon.price < 0) {
          return 'Add-on price must be a non-negative number'
        }
      }
    }
  }
  return null
}

function calculateTotal(items) {
  let subtotal = 0
  for (const item of items) {
    const addonTotal = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0)
    subtotal += (item.price + addonTotal) * item.quantity
  }
  return subtotal
}

export async function placeOrder(req, res) {
  try {
    const { customer_name, customer_contact, address, items, maps_link, delivery_fee, in_zone } = req.body
    const userId = req.userId

    if (!customer_name || !customer_contact || !address) {
      return res.status(400).json({ error: 'Customer name, contact, and address are required' })
    }

    if (!/^09\d{9}$/.test(customer_contact.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Contact must be a valid Philippine mobile number (09XXXXXXXXX)' })
    }

    const safeName = customer_name.trim().slice(0, 100)
    const safeContact = customer_contact.replace(/\D/g, '').slice(0, 11)
    const safeAddress = address.trim().slice(0, 500)

    const validationError = validateCart(items)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    await ensureMenuLoaded()
    for (const item of items) {
      const dbItem = await getMenuItemById(item.id)
      if (!dbItem) {
        return res.status(400).json({
          error: `"${item.name || item.id}" is not available on the menu`,
        })
      }
      if (Math.abs(dbItem.price - item.price) > 0.01) {
        return res.status(400).json({
          error: `Price mismatch for "${item.name}". Expected ₱${dbItem.price}, got ₱${item.price}`,
        })
      }
    }

    const subtotal = calculateTotal(items)
    const total = subtotal + (delivery_fee || 0)

    // Check for rescue match
    let rescueMatch = null
    try {
      rescueMatch = await findMatchingRescue(items)
    } catch {}

    const orderData = {
      user_id: userId,
      customer_name: safeName,
      customer_contact: safeContact,
      address: safeAddress,
      maps_link: maps_link || null,
      in_zone: in_zone ?? true,
      delivery_fee: delivery_fee || 0,
      items,
      subtotal,
      total,
    }

    // If rescue match found, mark as rescue order
    if (rescueMatch) {
      orderData.is_rescue = true
      orderData.express_badge = true
    }

    const { data, error } = await createOrder(orderData)

    if (error) throw error

    // Claim the rescue match
    if (rescueMatch?.hold?.id) {
      try {
        await claimRescueMatch(rescueMatch.hold.id, data.id, rescueMatch.matchedItems)
      } catch {}
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order: data,
      rescueMatch: rescueMatch ? {
        matched: true,
        items: rescueMatch.matchedItems,
        expressBadge: true,
      } : undefined,
    })
  } catch (err) {
    console.error('placeOrder error:', err)
    res.status(500).json({ error: 'Failed to place order' })
  }
}

export async function getOrders(req, res) {
  try {
    const orders = await getAllOrders()
    res.json(orders)
  } catch (err) {
    console.error('getOrders error:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

export async function getMyOrders(req, res) {
  try {
    const orders = await getOrdersByUser(req.userId)
    res.json(orders)
  } catch (err) {
    console.error('getMyOrders error:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

export async function removeOrder(req, res) {
  try {
    const { id } = req.params
    const order = await deleteOrder(id)
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json({ message: 'Order deleted', order })
  } catch (err) {
    console.error('deleteOrder error:', err)
    res.status(500).json({ error: 'Failed to delete order' })
  }
}

export async function updateOrder(req, res) {
  try {
    const { id } = req.params
    const { status } = req.body

    const VALID_STATUSES = ['pending', 'ongoing', 'in_delivery', 'done', 'canceled']
    if (!status || !VALID_STATUSES.includes(status.toLowerCase())) {
      return res.status(400).json({ error: 'Status must be pending, ongoing, in_delivery, done, or canceled' })
    }

    const order = await updateOrderStatus(id, status.toLowerCase())
    if (!order) {
      return res.status(404).json({ error: 'Order not found' })
    }

    res.json(order)
  } catch (err) {
    console.error('updateOrder error:', err)
    res.status(500).json({ error: 'Failed to update order' })
  }
}

export async function trackOrder(req, res) {
  try {
    const { contact } = req.params
    if (!contact) return res.status(400).json({ error: 'Contact number is required' })

    const orders = await getOrdersByContact(contact)
    res.json(orders)
  } catch (err) {
    console.error('trackOrder error:', err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
}

export async function cancelOrder(req, res) {
  try {
    const { id } = req.params
    const allOrders = await getAllOrders()
    const order = allOrders.find(o => String(o.id) === String(id))
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const canceled = await updateOrderStatus(id, 'canceled')
    if (!canceled) return res.status(404).json({ error: 'Order not found' })

    // Auto-refund
    await processAutoRefund(order)

    // Create rescue hold (food is available for matching)
    const hold = await createRescueHold(order)

    res.json({
      message: 'Order canceled',
      order: canceled,
      refund: 'processed',
      rescueHold: hold ? 'created' : 'skipped',
    })
  } catch (err) {
    console.error('cancelOrder error:', err)
    res.status(500).json({ error: 'Failed to cancel order' })
  }
}
