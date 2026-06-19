import { Router } from 'express'
import rateLimit from 'express-rate-limit'

const router = Router()

const locationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many requests, slow down' } })

router.post('/resolve', locationLimiter, async (req, res) => {
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
    const allowedHosts = ['google.com', 'goo.gl', 'maps.app', 'maps.google.com', 'www.google.com', 'www.goo.gl']
    if (!allowedHosts.includes(host) && !host.endsWith('.google.com')) {
      return res.status(400).json({ error: 'Only Google Maps URLs are supported' })
    }
    let resolved = url
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(5000) })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location || !location.startsWith('https://')) {
        return res.status(400).json({ error: 'Redirect target must be HTTPS' })
      }
      const resp2 = await fetch(location, { redirect: 'follow', signal: AbortSignal.timeout(5000) })
      resolved = resp2.url
    }
    console.log('Resolved URL:', resolved)

    const atMatch = resolved.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (atMatch) {
      return res.json({ lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) })
    }
    const qMatch = resolved.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
    if (qMatch) {
      return res.json({ lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) })
    }
    const coordMatch = resolved.match(/(\d{1,2}\.\d+)[+,]\s*\+?(\d{1,3}\.\d+)/)
    if (coordMatch) {
      return res.json({ lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) })
    }
    const searchMatch = resolved.match(/\/search\/(\d+\.\d+),\+(\d+\.\d+)/)
    if (searchMatch) {
      return res.json({ lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) })
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
    const dirMatch = resolved.match(/\/dir\/\/?([^/]+?)\/@/)
    if (dirMatch) {
      const query = decodeURIComponent(dirMatch[1].replace(/\+/g, ' '))
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
