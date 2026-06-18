import { getConfig, updateConfig, addRating, getRatings } from '../services/config.js'
import { saveFile, validateImageMime } from '../services/storage.js'

function parseKmlCoordinates(kmlText) {
  const coordsRe = /<(?:[^:]*:)?coordinates[^>]*>([\s\S]*?)<\s*\/(?:[^:]*:)?coordinates\s*>/i
  const coordsMatch = kmlText.match(coordsRe)
  if (!coordsMatch) return null
  let raw = coordsMatch[1].trim()
  raw = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
  const tokens = raw.split(/\s+/).filter(Boolean)
  const points = tokens.map(pair => {
    const parts = pair.split(',').map(Number)
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null
    return [parts[1], parts[0]]
  }).filter(Boolean)
  return points.length > 2 ? points : null
}

function extractNetworkLinkHref(kmlText) {
  const match = kmlText.match(/<href[^>]*>([\s\S]*?)<\/href\s*>/i)
  if (!match) return null
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

export async function getConfigHandler(req, res) {
  try {
    const cfg = await getConfig()
    res.json({ heroImage: cfg.heroImage, heroDishName: cfg.heroDishName || 'Lechon Kawali', heroDishPrice: cfg.heroDishPrice || 140, testimonials: cfg.testimonials || [], deliveryFeeInZone: cfg.deliveryFeeInZone ?? 40, deliveryFeeOutOfZone: cfg.deliveryFeeOutOfZone ?? 80, zoneImage: cfg.zoneImage || null, zonePolygon: cfg.zonePolygon || null, zoneKml: cfg.zoneKml || null })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch config' })
  }
}

export async function updateHeroImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' })
    const ALLOWED = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
    const ext = ALLOWED[req.file.mimetype]
    if (!ext || !validateImageMime(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' })
    const filename = 'hero-' + Date.now() + ext
    const url = await saveFile(filename, req.file.buffer, req.file.mimetype)
    await updateConfig({ heroImage: url })
    res.json({ heroImage: url })
  } catch (err) {
    console.error('Hero image upload failed:', err.message)
    res.status(500).json({ error: 'Failed to save image' })
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
    if (name !== undefined) updates.heroDishName = String(name).trim().replace(/<[^>]*>/g, '')
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
    const sanitized = testimonials.map(t => ({
      ...t,
      name: String(t.name || '').replace(/<[^>]*>/g, ''),
      text: String(t.text || '').replace(/<[^>]*>/g, ''),
    }))
    await updateConfig({ testimonials: sanitized })
    res.json({ testimonials })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update testimonials' })
  }
}

export async function submitRating(req, res) {
  try {
    const { name, rating, comment } = req.body
    if (!name || !rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Name and rating (1-5) required' })
    const entry = await addRating({ name: name.trim().replace(/<[^>]*>/g, '').slice(0, 100), rating: Number(rating), comment: (comment || '').trim().replace(/<[^>]*>/g, '').slice(0, 500) })
    res.status(201).json(entry)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
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

export async function deleteRating(req, res) {
  try {
    const { name } = req.params
    if (!name) return res.status(400).json({ error: 'Name required' })
    const cfg = await getConfig()
    const ratings = (cfg.ratings || []).filter(r => r.name !== name)
    await updateConfig({ ratings })
    res.json({ message: 'Rating deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rating' })
  }
}

export async function updateDeliveryFeeHandler(req, res) {
  try {
    const { inZone, outOfZone } = req.body
    const updates = {}
    if (inZone !== undefined) {
      if (inZone < 0) return res.status(400).json({ error: 'In-zone fee must be non-negative' })
      updates.deliveryFeeInZone = Number(inZone)
    }
    if (outOfZone !== undefined) {
      if (outOfZone < 0) return res.status(400).json({ error: 'Out-of-zone fee must be non-negative' })
      updates.deliveryFeeOutOfZone = Number(outOfZone)
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Provide inZone and/or outOfZone' })
    await updateConfig(updates)
    res.json({ message: 'Delivery fees updated', ...updates })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update delivery fees' })
  }
}

export async function uploadZoneImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' })
    const ALLOWED = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }
    const ext = ALLOWED[req.file.mimetype]
    if (!ext || !validateImageMime(req.file.buffer, req.file.mimetype)) return res.status(400).json({ error: 'Only JPEG, PNG, or WebP images are allowed' })
    const filename = 'zone-' + Date.now() + ext
    const url = await saveFile(filename, req.file.buffer, req.file.mimetype)
    await updateConfig({ zoneImage: url })
    res.json({ zoneImage: url })
  } catch (err) {
    console.error('Zone image upload failed:', err.message)
    res.status(500).json({ error: 'Failed to save image' })
  }
}

export async function deleteZoneImage(req, res) {
  try {
    await updateConfig({ zoneImage: null })
    res.json({ message: 'Zone image cleared' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear zone image' })
  }
}

export async function uploadZoneKml(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'KML file is required' })
    let kmlText = req.file.buffer.toString('utf-8')
    console.log('KML file received, size:', req.file.size, 'bytes, mimetype:', req.file.mimetype)

    let polygon = parseKmlCoordinates(kmlText)

    if (!polygon) {
      const href = extractNetworkLinkHref(kmlText)
      if (href) {
        let parsedHref
        try { parsedHref = new URL(href) } catch { return res.status(400).json({ error: 'Invalid NetworkLink href in KML' }) }
        if (parsedHref.protocol !== 'https:') {
          return res.status(400).json({ error: 'NetworkLink href must use HTTPS' })
        }
        console.log('KML has NetworkLink, fetching from:', href)
        try {
          const resp = await fetch(href)
          if (resp.ok) {
            const resolved = await resp.text()
            console.log('Resolved KML size:', resolved.length, 'bytes')
            polygon = parseKmlCoordinates(resolved)
          } else {
            console.log('Failed to fetch NetworkLink href, status:', resp.status)
          }
        } catch (fetchErr) {
          console.log('NetworkLink fetch failed:', fetchErr.message)
        }
        if (!polygon) {
          return res.status(400).json({ error: 'Google blocked the KML fetch.' })
        }
      }
    }

    if (!polygon) {
      console.log('KML parse failed. First 500 chars:', kmlText.slice(0, 500))
      return res.status(400).json({ error: 'Could not find valid polygon coordinates in KML. Make sure your map has a drawn polygon and try exporting again.' })
    }
    await updateConfig({ zoneKml: kmlText, zonePolygon: polygon })
    res.json({ message: 'Zone KML uploaded', zonePolygon: polygon })
  } catch (err) {
    console.error('KML upload failed:', err.message)
    res.status(500).json({ error: 'Failed to upload KML' })
  }
}

export async function deleteZoneKml(req, res) {
  try {
    await updateConfig({ zoneKml: null, zonePolygon: null })
    res.json({ message: 'Zone KML cleared' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear zone KML' })
  }
}
