import { api } from '../api'

export async function fetchDeliveryFee() {
  try {
    const res = await fetch(api('/api/config'))
    if (!res.ok) return 40
    const cfg = await res.json()
    return cfg.deliveryFee ?? 40
  } catch {
    return 40
  }
}

export async function updateDeliveryFee(deliveryFee, token) {
  const res = await fetch(api('/api/config/delivery-fee'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ deliveryFee }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update delivery fee')
  return res.json()
}

export async function fetchZoneImage() {
  try {
    const res = await fetch(api('/api/config'))
    if (!res.ok) return null
    const cfg = await res.json()
    return cfg.zoneImage || null
  } catch {
    return null
  }
}

export function extractCoordinatesFromUrl(url) {
  if (!url) return null
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }
  const searchMatch = url.match(/\/search\/.*?@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) }
  return null
}
