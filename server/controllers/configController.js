import { getConfig, updateConfig, addRating, getRatings } from '../services/config.js'
import { saveFile } from '../services/storage.js'

export function getConfigHandler(req, res) {
  const cfg = getConfig()
  res.json({ heroImage: cfg.heroImage })
}

export function updateHeroImage(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Image file is required' })
  const ext = ({ 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' })[req.file.mimetype] || '.bin'
  const filename = 'hero-' + Date.now() + ext
  saveFile(filename, req.file.buffer, req.file.mimetype).then(url => {
    updateConfig({ heroImage: url })
    res.json({ heroImage: url })
  }).catch(() => res.status(500).json({ error: 'Failed to save image' }))
}

export function submitRating(req, res) {
  const { name, rating, comment } = req.body
  if (!name || !rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Name and rating (1-5) required' })
  const entry = addRating({ name: name.trim(), rating: Number(rating), comment: (comment || '').trim() })
  res.status(201).json(entry)
}

export function getRatingsHandler(req, res) {
  res.json(getRatings())
}
