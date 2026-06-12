import { Router } from 'express'

const router = Router()

router.post('/resolve', async (req, res) => {
  try {
    const { url } = req.body
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' })
    }
    if (!url.includes('google') && !url.includes('goo.gl') && !url.includes('maps.app')) {
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
    res.status(400).json({ error: 'Could not extract coordinates from the link. Please try a different link format.' })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Timed out resolving link' })
    }
    res.status(500).json({ error: 'Failed to resolve link' })
  }
})

export default router
