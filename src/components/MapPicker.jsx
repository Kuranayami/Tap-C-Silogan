import { useEffect, useRef, useState } from 'react'
import { Crosshair, Loader2 } from 'lucide-react'

export default function MapPicker({ mapsLink, onMapsLinkChange, onAddressChange, dark }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const leafletRef = useRef(null)
  const [detecting, setDetecting] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled) return
      leafletRef.current = L

      const defaultCoords = [14.5582, 121.0217]
      let lat, lng

      if (mapsLink?.includes('@')) {
        const atMatch = mapsLink.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (atMatch) { lat = parseFloat(atMatch[1]); lng = parseFloat(atMatch[2]) }
      } else if (mapsLink?.includes('/search/')) {
        const sMatch = mapsLink.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/)
        if (sMatch) { lat = parseFloat(sMatch[1]); lng = parseFloat(sMatch[2]) }
      } else if (mapsLink?.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)) {
        const qMatch = mapsLink.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
        if (qMatch) { lat = parseFloat(qMatch[1]); lng = parseFloat(qMatch[2]) }
      }

      if ((!lat || !lng) && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          )
          if (!cancelled) { lat = pos.coords.latitude; lng = pos.coords.longitude }
        } catch {}
      }

      if (cancelled) return
      lat = lat || defaultCoords[0]
      lng = lng || defaultCoords[1]

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current && !mapInstance.current) {
        const map = L.map(mapRef.current, { zoomControl: false }).setView([lat, lng], 15)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
        markerRef.current = marker

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          updateLocation(pos.lat, pos.lng)
        })

        map.on('click', (e) => {
          marker.setLatLng(e.latlng)
          updateLocation(e.latlng.lat, e.latlng.lng)
        })

        mapInstance.current = map
        if (!cancelled) setMapReady(true)

        if (mapsLink) {
          const pos = marker.getLatLng()
          updateLocation(pos.lat, pos.lng, true)
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [])

  function updateLocation(lat, lng, skipUpdate) {
    const link = `https://www.google.com/maps?q=${lat},${lng}`
    if (!skipUpdate) onMapsLinkChange(link)
    if (!skipUpdate && onAddressChange) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'TapCSilogan/1.0' },
      })
        .then(r => r.json())
        .then(d => {
          const addr = d?.display_name
          if (addr) {
            const parts = addr.split(', ')
            const short = parts.slice(0, 3).join(', ')
            onAddressChange(short)
          }
        })
        .catch(() => {})
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        if (mapInstance.current && markerRef.current) {
          mapInstance.current.setView([lat, lng], 16)
          markerRef.current.setLatLng([lat, lng])
          updateLocation(lat, lng)
        }
        setDetecting(false)
      },
      () => setDetecting(false),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const t = dark ? { label: 'text-[#a1a1aa]', border: 'border-[#27272a]', loaderBg: 'bg-[#18181b]', loaderIcon: 'text-[#71717a]', btnBg: 'bg-[#27272a] hover:bg-[#333]', btnText: 'text-white', hint: 'text-[#71717a]/60' } : { label: 'text-[#D48040]', border: 'border-[#FFEC9E]', loaderBg: 'bg-[#FFFBDA]', loaderIcon: 'text-[#D48040]/60', btnBg: 'bg-[#FFEC9E] hover:bg-[#FFD966]', btnText: 'text-[#4A3728]', hint: 'text-[#D48040]/60' }

  return (
    <div>
      <label className={`block text-sm font-medium ${t.label} mb-1.5`}>Location on Map</label>
      <div className={`relative rounded-xl overflow-hidden border ${t.border}`} style={{ height: '250px' }}>
        <div ref={mapRef} className="w-full h-full" />
        {!mapReady && (
          <div className={`absolute inset-0 flex items-center justify-center ${t.loaderBg}`}>
            <Loader2 className={`w-6 h-6 animate-spin ${t.loaderIcon}`} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mt-2">
        <button type="button" onClick={handleDetectLocation} disabled={detecting}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${t.btnBg} ${t.btnText} text-xs font-medium transition-all disabled:opacity-50`}>
          {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
          {detecting ? 'Detecting...' : 'Detect My Location'}
        </button>
        <span className={`text-[10px] ${t.hint}`}>Click the map or drag the marker</span>
      </div>
    </div>
  )
}
