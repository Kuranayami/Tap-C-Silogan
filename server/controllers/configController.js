import { getConfig, updateConfig, addRating, getRatings } from '../services/config.js'
import { saveFile } from '../services/storage.js'

export async function getConfigHandler(req, res) {
  try {
    const cfg = await getConfig()
    res.json({ heroImage: cfg.heroImage })
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
