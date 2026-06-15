import { api } from '../api'

export async function fetchDeliveryFees() {
  try {
    const res = await fetch(api('/api/config'))
    if (!res.ok) return { inZone: 40, outOfZone: 80 }
    const cfg = await res.json()
    return { inZone: cfg.deliveryFeeInZone ?? 40, outOfZone: cfg.deliveryFeeOutOfZone ?? 80 }
  } catch {
    return { inZone: 40, outOfZone: 80 }
  }
}

export async function updateDeliveryFees({ inZone, outOfZone }, token) {
  const body = {}
  if (inZone !== undefined) body.inZone = inZone
  if (outOfZone !== undefined) body.outOfZone = outOfZone
  const res = await fetch(api('/api/config/delivery-fee'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to update delivery fees')
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

export async function fetchZonePolygon() {
  try {
    const res = await fetch(api('/api/config'))
    if (!res.ok) return null
    const cfg = await res.json()
    return cfg.zonePolygon || null
  } catch {
    return null
  }
}

export function pointInPolygon(point, polygon) {
  const [lat, lng] = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [latI, lngI] = polygon[i]
    const [latJ, lngJ] = polygon[j]
    if ((lngI > lng) !== (lngJ > lng) && lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI) {
      inside = !inside
    }
  }
  return inside
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
