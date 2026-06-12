import { getMenu, addMenuItem, updateMenuItem, removeMenuItem } from '../services/supabase.js'
import { saveFile, deleteFile } from '../services/storage.js'

const MIME_TO_EXT = {
  'image/jpeg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/gif': '.gif',
}

const ALLOWED_TYPES = Object.keys(MIME_TO_EXT)
const VALID_CATEGORIES = ['ulam', 'silog', 'shake', 'solo']
const MAX_NAME_LENGTH = 100

export async function getMenuItems(req, res) {
  try {
    const { data, error } = await getMenu()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu items' })
  }
}

export async function createMenuItem(req, res) {
  try {
    const { name, price, category } = req.body
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' })
    }
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` })
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Category must be ulam, silog, shake, or solo' })
    }
    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number' })
    }

    let image = null
    if (req.file) {
      const ext = MIME_TO_EXT[req.file.mimetype] || '.bin'
      if (!ALLOWED_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' })
      }
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
      image = await saveFile(filename, req.file.buffer, req.file.mimetype)
    }

    const item = await addMenuItem({ name: name.trim(), price: priceNum, category, image })
    res.status(201).json(item)
  } catch (err) {
    console.error('createMenuItem error:', err)
    res.status(500).json({ error: 'Failed to add menu item' })
  }
}

export async function editMenuItem(req, res) {
  try {
    const { id } = req.params
    const { name, price, category } = req.body
    const data = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0 || name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `Name must be between 1 and ${MAX_NAME_LENGTH} characters` })
      }
      data.name = name.trim()
    }
    if (price !== undefined) {
      const priceNum = Number(price)
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Price must be a valid non-negative number' })
      }
      data.price = priceNum
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Category must be ulam, silog, shake, or solo' })
      }
      data.category = category
    }
    if (req.body.active !== undefined) {
      data.active = req.body.active === 'true' || req.body.active === true
    }
    if (req.file) {
      const ext = MIME_TO_EXT[req.file.mimetype] || '.bin'
      const filename = Date.now() + '-' + Math.round(Math.random() * 1e9) + ext
      data.image = await saveFile(filename, req.file.buffer, req.file.mimetype)
    }

    const item = await updateMenuItem(id, data)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    res.json(item)
  } catch (err) {
    console.error('editMenuItem error:', err)
    res.status(500).json({ error: 'Failed to update menu item' })
  }
}

export async function deleteMenuItem(req, res) {
  try {
    const { id } = req.params
    const item = await removeMenuItem(id)
    if (!item) return res.status(404).json({ error: 'Item not found' })
    if (item.image) deleteFile(item.image)
    res.json({ message: 'Item deleted', item })
  } catch (err) {
    console.error('deleteMenuItem error:', err)
    res.status(500).json({ error: 'Failed to delete menu item' })
  }
}
