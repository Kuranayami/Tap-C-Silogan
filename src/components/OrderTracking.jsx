import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, Bike, CheckCircle, XCircle, ArrowLeft, MapPin, Phone, User, ShoppingBag, Zap, AlertTriangle, RefundIcon, Map, Navigation } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useOrderRealtime } from '../hooks/useOrderRealtime'
import 'leaflet/dist/leaflet.css'

const STATUS_CONFIG = {
  pending:       { label: 'Pending',       icon: Clock,       color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400' },
  ongoing:       { label: 'Ongoing',       icon: Package,     color: 'text-blue-400',  bg: 'bg-blue-500/10',  border: 'border-blue-500/25',  dot: 'bg-blue-400' },
  in_delivery:   { label: 'In Delivery',   icon: Bike,        color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400' },
  done:          { label: 'Delivered',     icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/25', dot: 'bg-green-400' },
  canceled:      { label: 'Canceled',      icon: XCircle,     color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/25',   dot: 'bg-red-400' },
}

const STATUS_ORDER = ['pending', 'ongoing', 'in_delivery', 'done']

function statusIndex(s) {
  const i = STATUS_ORDER.indexOf(s)
  return i === -1 ? (s === 'canceled' ? -1 : -2) : i
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hrs = Math.floor(min / 60)
  return `${hrs}h ${min % 60}m ago`
}

const OrderCard = memo(({ order, canCancel, onCancel }) => {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  const idx = statusIndex(order.status)
  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div className={`bg-[#18181b] border ${order.express_badge ? 'border-yellow-500/40' : 'border-[#27272a]'} rounded-xl p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </div>
          {order.express_badge && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-bold border border-yellow-500/30">
              <Zap className="w-3 h-3" /> Express
            </span>
          )}
          {order.is_rescue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/30">
              Rescued
            </span>
          )}
        </div>
        <span className="text-xs text-[#71717a]">{timeAgo(order.created_at)}</span>
      </div>

      {order.status !== 'canceled' && idx >= 0 && (
        <div className="flex items-center gap-1">
          {STATUS_ORDER.map((s, i) => {
            const dot = STATUS_CONFIG[s]
            const filled = i <= idx
            return (
              <div key={s} className="flex-1 flex items-center">
                <div className={`w-2 h-2 rounded-full ${filled ? dot.dot : 'bg-[#27272a]'}`} />
                {i < STATUS_ORDER.length - 1 && (
                  <div className={`flex-1 h-0.5 ${filled ? 'bg-[#f97316]' : 'bg-[#27272a]'}`} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {order.refund_amount > 0 && order.payment_method && order.payment_method !== 'cod' && (
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 flex items-center gap-1.5">
          Refunded P{order.refund_amount} - {order.refund_status}
        </div>
      )}

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <User className="w-3.5 h-3.5" />
          <span className="text-white truncate">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <Phone className="w-3.5 h-3.5" />
          <span>{order.customer_contact}</span>
        </div>
        <div className="flex items-center gap-2 text-[#a1a1aa] min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs line-clamp-2">{order.address}</span>
        </div>
        {order.in_zone === true && (
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            In delivery zone
          </div>
        )}
        {order.in_zone === false && (
          <div className="flex items-center gap-1.5 text-[10px] text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Outside delivery zone
          </div>
        )}
      </div>

      {order.status === 'in_delivery' && order.rider_name && (
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-blue-400">
            <Bike className="w-3.5 h-3.5" />
            <span className="font-medium">{order.rider_name}</span>
          </div>
        </div>
      )}

      {order.status === 'in_delivery' && order.maps_link && (
        <a
          href={order.maps_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
        >
          <Navigation className="w-3.5 h-3.5" /> View delivery location
        </a>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-[#71717a]">
          {totalItems} item{totalItems !== 1 ? 's' : ''} &middot; P{order.total}
        </div>
        {canCancel && (
          <button
            onClick={() => onCancel(order.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all min-h-[32px]"
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Order
          </button>
        )}
      </div>

      {order.items && (
        <details className="text-xs text-[#71717a]">
          <summary className="cursor-pointer hover:text-[#a1a1aa]">View items</summary>
          <ul className="mt-1.5 space-y-1 pl-2">
            {order.items.map((item, i) => (
              <li key={item.id || item.menu_id || i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>P{(item.price + (item.addons || []).reduce((s, a) => s + a.price, 0)) * item.quantity}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
})

function LiveMap({ orderId }) {
  const [location, setLocation] = useState(null)
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)
  const initStarted = useRef(false)

  useEffect(() => {
    if (!orderId) return
    const controller = new AbortController()
    const fetchLoc = async () => {
      try {
        const res = await fetch(api(`/api/rescue/location/${orderId}`), { signal: controller.signal })
        if (res.ok) {
          const data = await res.json()
          if (data && data.lat != null) setLocation(data)
        }
      } catch {}
    }
    fetchLoc()
    const interval = setInterval(fetchLoc, 8000)
    return () => { clearInterval(interval); controller.abort() }
  }, [orderId])

  // Create map once on first location
  useEffect(() => {
    if (!location || !mapRef.current || mapInstance.current) return
    ;(async () => {
      const L = (await import('leaflet')).default
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      if (!mapRef.current) return
      const map = L.map(mapRef.current, { zoomControl: false }).setView([location.lat, location.lng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        detectRetina: true,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      markerRef.current = L.marker([location.lat, location.lng]).addTo(map)
      mapInstance.current = map
      setTimeout(() => map.invalidateSize(), 100)
    })()
  }, [location])

  // Move marker on subsequent location updates without recreating map
  useEffect(() => {
    if (!location || !mapInstance.current || !markerRef.current) return
    markerRef.current.setLatLng([location.lat, location.lng])
  }, [location])

  if (!location) {
    return (
      <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] text-center">
        <Bike className="w-8 h-8 text-[#27272a] mx-auto mb-2" />
        <p className="text-xs text-[#71717a]">Waiting for driver location...</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#27272a]">
      <div className="bg-[#18181b] p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-white">Driver</span>
        </div>
      </div>
      <div ref={mapRef} className="bg-[#09090b] h-[200px] sm:h-[300px]" />
    </div>
  )
}

function ConfirmDialog({ open, onConfirm, onCancel, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 max-w-xs w-full mx-3 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-white mb-2">Cancel this order?</h3>
        <p className="text-xs text-[#71717a] mb-4">This cannot be undone. Any rescue-eligible items will be held for matching.</p>
        <div className="flex items-center gap-2 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white text-xs font-medium transition-all disabled:opacity-50">No</button>
          <button onClick={onConfirm} disabled={loading} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-1">
            {loading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OrderTracking() {
  const { user, token } = useAuth()
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [cancelling, setCancelling] = useState(null)
  const [confirmOrderId, setConfirmOrderId] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const fetchOrders = useCallback(async () => {
    const t = tokenRef.current
    if (!t || !user) return
    try {
      const res = await fetch(api('/api/orders/my'), {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) setOrders(await res.json())
    } catch {}
  }, [user])

  useEffect(() => {
    if (!token || !user) return
    setLoading(true)
    fetch(api('/api/orders/my'), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setOrders(data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false))
  }, [token, user])

  useOrderRealtime(useCallback((payload) => {
    if (payload._poll) { fetchOrders(); return }
    if (!user) return
    const belongsToUser = payload.new?.user_id === user.id || payload.old?.user_id === user.id
    if (!belongsToUser) return
    if (payload.eventType === 'INSERT') {
      setOrders(prev => prev ? [payload.new, ...prev] : [payload.new])
    } else if (payload.eventType === 'UPDATE') {
      setOrders(prev => prev ? prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o) : prev)
    } else if (payload.eventType === 'DELETE') {
      setOrders(prev => prev ? prev.filter(o => o.id !== payload.old.id) : prev)
    }
  }, [user, fetchOrders]))

  const handleCancelOrder = useCallback(async (orderId) => {
    setCancelling(orderId)
    try {
      const res = await fetch(api(`/api/orders/user/cancel/${orderId}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (res.ok) {
        fetchOrders()
      }
    } catch {} finally {
      setCancelling(null)
    }
  }, [token, fetchOrders])

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-4 sm:p-6 max-w-2xl mx-auto flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 text-[#27272a] mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Sign in to track your orders</h1>
          <p className="text-sm text-[#71717a] mb-6">You need to be logged in to view your order history.</p>
          <a href="#/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const activeOrders = orders?.filter(o => !['done', 'canceled'].includes(o.status)) || []
  const historyOrders = orders?.filter(o => ['done', 'canceled'].includes(o.status)) || []
  const displayOrders = activeTab === 'all' ? (orders || []) : activeTab === 'active' ? activeOrders : historyOrders

  const canCancelOrder = (order) => {
    return order.status === 'pending'
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a href="#" className="p-2 text-[#a1a1aa] hover:text-white transition-colors rounded-lg hover:bg-[#18181b]">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <h1 className="text-lg font-semibold">My Orders</h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto flex-nowrap scrollbar-thin">
        <button onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'all' ? 'bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30' : 'text-[#71717a] border border-[#27272a] hover:text-white'
          }`}>All ({orders?.length || 0})</button>
        <button onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#71717a] border border-[#27272a] hover:text-white'
          }`}>Active ({activeOrders.length})</button>
        <button onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'history' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-[#71717a] border border-[#27272a] hover:text-white'
          }`}>History ({historyOrders.length})</button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-[#27272a] mx-auto mb-3 animate-pulse" />
          <p className="text-[#71717a] text-sm">Loading your orders...</p>
        </div>
      ) : displayOrders.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-[#71717a]">{displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''}</p>
          {displayOrders.map(order => (
            <div key={order.id}>
              {order.status === 'in_delivery' && activeTab !== 'history' && (
                <LiveMap orderId={order.id} />
              )}
              <OrderCard
                order={order}
                canCancel={canCancelOrder(order)}
                onCancel={setConfirmOrderId}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
          <p className="text-[#a1a1aa] text-sm mb-4">
            {activeTab === 'all' ? 'No orders yet' : activeTab === 'active' ? 'No active orders' : 'No order history'}
          </p>
          {activeTab !== 'history' && (
            <a href="#menu" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold transition-all">
              Browse Menu
            </a>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmOrderId !== null}
        loading={cancelling === confirmOrderId}
        onConfirm={() => { const id = confirmOrderId; setConfirmOrderId(null); handleCancelOrder(id) }}
        onCancel={() => setConfirmOrderId(null)}
      />
    </div>
  )
}
