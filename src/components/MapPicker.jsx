import { useEffect, useRef, useState } from 'react'
import { Crosshair, Loader2 } from 'lucide-react'
import 'leaflet/dist/leaflet.css'

export default function MapPicker({ mapsLink, onMapsLinkChange, onAddressChange, dark }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const leafletRef = useRef(null)
  const [detecting, setDetecting] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  function parseCoordsFromLink(link) {
    if (!link) return null
    if (link.includes('@')) {
      const m = link.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (m) return [parseFloat(m[1]), parseFloat(m[2])]
    }
    if (link.includes('/search/')) {
      const m = link.match(/\/search\/(-?\d+\.?\d*),\+?(-?\d+\.?\d*)/)
      if (m) return [parseFloat(m[1]), parseFloat(m[2])]
    }
    if (link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)) {
      const m = link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/)
      if (m) return [parseFloat(m[1]), parseFloat(m[2])]
    }
    return null
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const L = (await import('leaflet')).default
      if (cancelled) return
      leafletRef.current = L

      let lat, lng
      const parsed = parseCoordsFromLink(mapsLink)
      if (parsed) { lat = parsed[0]; lng = parsed[1] }

      if (!lat && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          )
          if (!cancelled) { lat = pos.coords.latitude; lng = pos.coords.longitude }
        } catch {}
      }

      if (cancelled) return

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (mapRef.current && !mapInstance.current) {
        const map = L.map(mapRef.current, { zoomControl: false })
        if (lat && lng) map.setView([lat, lng], lat ? 15 : 2)
        else map.setView([20, 0], 2)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map)
        L.control.zoom({ position: 'bottomright' }).addTo(map)

        const marker = L.marker(lat && lng ? [lat, lng] : [0, 0], { draggable: true })
        if (lat && lng) marker.addTo(map)
        markerRef.current = marker

        marker.on('dragend', () => {
          const pos = marker.getLatLng()
          if (!marker._map) marker.addTo(map)
          updateLocation(pos.lat, pos.lng)
        })

        map.on('click', (e) => {
          marker.setLatLng(e.latlng)
          if (!marker._map) marker.addTo(map)
          updateLocation(e.latlng.lat, e.latlng.lng)
        })

        mapInstance.current = map
        if (!cancelled) setMapReady(true)

        if (mapsLink) {
          const pos = marker.getLatLng()
          if (pos.lat !== 0 || pos.lng !== 0) updateLocation(pos.lat, pos.lng, true)
        }
      }
    }
    init()
    return () => {
      cancelled = true
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return
    const parsed = parseCoordsFromLink(mapsLink)
    if (parsed) {
      const [lat, lng] = parsed
      markerRef.current.setLatLng([lat, lng])
      mapInstance.current.setView([lat, lng], mapInstance.current.getZoom())
    }
  }, [mapsLink])

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
