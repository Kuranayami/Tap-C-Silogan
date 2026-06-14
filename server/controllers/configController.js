import { getConfig, updateConfig, addRating, getRatings } from '../services/config.js'
import { saveFile } from '../services/storage.js'

export async function getConfigHandler(req, res) {
  try {
    const cfg = await getConfig()
    res.json({ heroImage: cfg.heroImage, heroDishName: cfg.heroDishName || 'Lechon Kawali', heroDishPrice: cfg.heroDishPrice || 140, testimonials: cfg.testimonials || [] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' })
  }
}

export async function updateHeroImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' })
    const ext = ({ 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[req.file.mimetype] || '.bin'
    const filename = 'hero-' + Date.now() + ext
    const url = await saveFile(filename, req.file.buffer, req.file.mimetype)
    await updateConfig({ heroImage: url })
    res.json({ heroImage: url })
  } catch (err) {
    console.error('Hero image upload failed:', err.message)
    res.status(500).json({ error: err.message || 'Failed to save image' })
  }
}

export async function deleteHeroImage(req, res) {
  try {
    await updateConfig({ heroImage: null })
    res.json({ message: 'Hero image cleared' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear hero image' })
  }
}

export async function updateHeroDish(req, res) {
  try {
    const { name, price } = req.body
    const updates = {}
    if (name !== undefined) updates.heroDishName = String(name).trim()
    if (price !== undefined) updates.heroDishPrice = Number(price)
    await updateConfig(updates)
    res.json({ message: 'Hero dish updated', ...updates })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update hero dish' })
  }
}

export async function updateTestimonials(req, res) {
  try {
    const { testimonials } = req.body
    if (!Array.isArray(testimonials)) return res.status(400).json({ error: 'testimonials array required' })
    await updateConfig({ testimonials })
    res.json({ testimonials })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonials' })
  }
}

export async function submitRating(req, res) {
  try {
    const { name, rating, comment } = req.body
    if (!name || !rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Name and rating (1-5) required' })
    const entry = await addRating({ name: name.trim(), rating: Number(rating), comment: (comment || '').trim() })
    res.status(201).json(entry)
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit rating' })
  }
}

export async function getRatingsHandler(req, res) {
  try {
    res.json(await getRatings())
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ratings' })
  }
}
