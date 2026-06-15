import { Router } from 'express'

const router = Router()

router.post('/resolve', async (req, res) => {
  try {
    const { url } = req.body
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' })
    }
    let parsed
    try { parsed = new URL(url) } catch {
      return res.status(400).json({ error: 'Invalid URL' })
    }
    if (parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only HTTPS URLs are allowed' })
    }
    const host = parsed.hostname.toLowerCase()
    if (!host.endsWith('.google.com') && host !== 'google.com' && !host.endsWith('.goo.gl') && host !== 'goo.gl' && !host.endsWith('maps.app') && host !== 'maps.app') {
      return res.status(400).json({ error: 'Only Google Maps URLs are supported' })
    }
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(5000) })
    const resolved = response.url
    const atMatch = resolved.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) {
      return res.json({ lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) })
    }
    const qMatch = resolved.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qMatch) {
      return res.json({ lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) })
    }
    const placeMatch = resolved.match(/\/place\/([^/?#]+?)(?:\/|$|[?#])/)
    if (placeMatch) {
      const query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&addressdetails=0`,
        { headers: { 'User-Agent': 'TapCSilogan/1.0' }, signal: AbortSignal.timeout(5000) }
      )
      const geoData = await geoRes.json()
      if (geoData?.[0]?.lat && geoData?.[0]?.lon) {
        return res.json({ lat: parseFloat(geoData[0].lat), lng: parseFloat(geoData[0].lon) })
      }
    }
    res.status(400).json({ error: 'Could not extract coordinates from the link. Please open Google Maps, drop a pin, and share the link.' })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Timed out resolving link' })
    }
    res.status(500).json({ error: 'Failed to resolve link' })
  }
})

export default router
