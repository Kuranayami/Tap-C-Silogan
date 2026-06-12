// Barangay Industrial Valley Complex (IVC), Marikina City
// Polygon boundary sourced from OpenStreetMap relation 371353
// License: ODbL (OpenStreetMap contributors)

export const IVC_POLYGON = [
  { lat: 14.6322159, lng: 121.0776147 },
  { lat: 14.6316817, lng: 121.0775373 },
  { lat: 14.6314838, lng: 121.0774690 },
  { lat: 14.6309563, lng: 121.0774626 },
  { lat: 14.6303523, lng: 121.0771695 },
  { lat: 14.6296256, lng: 121.0769013 },
  { lat: 14.6290310, lng: 121.0758175 },
  { lat: 14.6288470, lng: 121.0751483 },
  { lat: 14.6286311, lng: 121.0743739 },
  { lat: 14.6283908, lng: 121.0743718 },
  { lat: 14.6279073, lng: 121.0744536 },
  { lat: 14.6264184, lng: 121.0747689 },
  { lat: 14.6252375, lng: 121.0750370 },
  { lat: 14.6249965, lng: 121.0750843 },
  { lat: 14.6247014, lng: 121.0751135 },
  { lat: 14.6239809, lng: 121.0752906 },
  { lat: 14.6237732, lng: 121.0750915 },
  { lat: 14.6230320, lng: 121.0758256 },
  { lat: 14.6228017, lng: 121.0759409 },
  { lat: 14.6218147, lng: 121.0764557 },
  { lat: 14.6213886, lng: 121.0765189 },
  { lat: 14.6208781, lng: 121.0765039 },
  { lat: 14.6203305, lng: 121.0762267 },
  { lat: 14.6195429, lng: 121.0758218 },
  { lat: 14.6182727, lng: 121.0779778 },
  { lat: 14.6182005, lng: 121.0781009 },
  { lat: 14.6181704, lng: 121.0781522 },
  { lat: 14.6181381, lng: 121.0782067 },
  { lat: 14.6177381, lng: 121.0788822 },
  { lat: 14.6181112, lng: 121.0791481 },
  { lat: 14.6191010, lng: 121.0798534 },
  { lat: 14.6194061, lng: 121.0801964 },
  { lat: 14.6195474, lng: 121.0803899 },
  { lat: 14.6198871, lng: 121.0808495 },
  { lat: 14.6203291, lng: 121.0812353 },
  { lat: 14.6205069, lng: 121.0813172 },
  { lat: 14.6210762, lng: 121.0815098 },
  { lat: 14.6219879, lng: 121.0817509 },
  { lat: 14.6232809, lng: 121.0818695 },
  { lat: 14.6244248, lng: 121.0818178 },
  { lat: 14.6263952, lng: 121.0822468 },
  { lat: 14.6264632, lng: 121.0822638 },
  { lat: 14.6269706, lng: 121.0817785 },
  { lat: 14.6277659, lng: 121.0810436 },
  { lat: 14.6287505, lng: 121.0802794 },
  { lat: 14.6311135, lng: 121.0786641 },
  { lat: 14.6313809, lng: 121.0784693 },
  { lat: 14.6317393, lng: 121.0781521 },
  { lat: 14.6320294, lng: 121.0778564 },
]

export const DELIVERY_FEE = 40

// Ray-casting algorithm: check if point is inside polygon
export function isInsideIVC(lat, lng) {
  let inside = false
  const n = IVC_POLYGON.length
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = IVC_POLYGON[i]
    const pj = IVC_POLYGON[j]
    if ((pi.lat > lat) !== (pj.lat > lat) &&
        lng < ((pj.lng - pi.lng) * (lat - pi.lat)) / (pj.lat - pi.lat) + pi.lng) {
      inside = !inside
    }
  }
  return inside
}

// Extract coordinates from various Google Maps link formats
// Supports: https://maps.app.goo.gl/..., https://www.google.com/maps/place/...@lat,lng,...
export function extractCoordinatesFromUrl(url) {
  if (!url) return null

  // Format: @lat,lng or @lat,lng,zoom
  const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

  // Format: ?q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }

  // Format: /search/.../@lat,lng
  const searchMatch = url.match(/\/search\/.*?@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
  if (searchMatch) return { lat: parseFloat(searchMatch[1]), lng: parseFloat(searchMatch[2]) }

  return null
}

// Check if address text mentions IVC or the barangay
const IVC_KEYWORDS = ['ivc', 'industrial valley', 'barangay industrial valley', 'brgy. industrial valley']
const MARIKINA_KEYWORDS = ['marikina', '1802']

export function addressMentionsIVC(address) {
  if (!address) return false
  const lower = address.toLowerCase()
  const hasIVC = IVC_KEYWORDS.some(k => lower.includes(k))
  const hasMarikina = MARIKINA_KEYWORDS.some(k => lower.includes(k))
  // If explicitly mentions IVC, assume it's inside
  if (hasIVC) return true
  // If mentions Marikina but NOT IVC, we still need coordinate verification
  if (hasMarikina) return 'needs_verification'
  return false
}
