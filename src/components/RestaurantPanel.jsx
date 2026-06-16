import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Package, Bike, ChefHat, LogOut, RefreshCw, CheckCircle, Phone, MapPin, Timer, AlertTriangle, ArrowLeft } from 'lucide-react'
import { api } from '../api'
import RestaurantLogin from './RestaurantLogin'
import { useOrderRealtime } from '../hooks/useOrderRealtime'

const COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400', text: 'text-amber-400' },
  { key: 'ongoing', label: 'Ongoing', icon: Package, color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400', text: 'text-blue-400' },
  { key: 'in_delivery', label: 'In Delivery', icon: Bike, color: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400', text: 'text-emerald-400' },
]

const STALE_THRESHOLD_MIN = 5

const restaurantHeaders = () => {
  const token = localStorage.getItem('restaurant_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (min < 1) return 'Just now'
  if (min === 1) return '1 min ago'
  if (min < 60) return `${min} min ago`
  const hrs = Math.floor(min / 60)
  return `${hrs}h ${min % 60}m ago`
}

export default function RestaurantPanel() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('restaurant_token'))
  const [restaurant, setRestaurant] = useState(() => {
    try { const p = localStorage.getItem('restaurant_profile'); return p ? JSON.parse(p) : null } catch { return null }
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readyLoading, setReadyLoading] = useState(null)

  const logout = useCallback(() => {
    localStorage.removeItem('restaurant_token')
    localStorage.removeItem('restaurant_profile')
    setLoggedIn(false)
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/restaurant/orders'), { headers: restaurantHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    if (loggedIn) fetchOrders()
  }, [loggedIn, fetchOrders])

  useEffect(() => {
    if (!loggedIn) return
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [loggedIn, fetchOrders])

  useOrderRealtime(useCallback((payload) => {
    if (!loggedIn) return
    if (payload._poll) { fetchOrders(); return }
    if (payload.eventType === 'INSERT') {
      setOrders(prev => [payload.new, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
    } else if (payload.eventType === 'DELETE') {
      setOrders(prev => prev.filter(o => o.id !== payload.old.id))
    }
  }, [loggedIn, fetchOrders]))

  const handleReady = async (orderId) => {
    setReadyLoading(orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'in_delivery' } : o))
    try {
      const res = await fetch(api(`/api/restaurant/orders/${orderId}/ready`), {
        method: 'PATCH',
        headers: { ...restaurantHeaders(), 'Content-Type': 'application/json' },
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ongoing' } : o))
        return
      }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o))
    } catch {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ongoing' } : o))
    } finally {
      setReadyLoading(null)
    }
  }

  const goBack = () => { window.location.hash = '' }

  if (!loggedIn) return <RestaurantLogin onLogin={(r) => { setRestaurant(r); setLoggedIn(true) }} />

  const columnOrders = (key) => orders.filter(o => (o.status || 'pending') === key)
  const staleOrders = orders.filter(o => (o.status || 'pending') === 'pending' && o.created_at && (Date.now() - new Date(o.created_at).getTime()) > STALE_THRESHOLD_MIN * 60000)

  return (
    <div className="min-h-screen bg-[#091413] text-[#B0E4CC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl border border-[#408A71] text-[#B0E4CC] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#408A71]" />
                Restaurant <span className="text-[#408A71]">Dashboard</span>
              </h1>
              <p className="text-xs text-[#408A71]">{restaurant?.name || ''} · {orders.filter(o => ['pending', 'ongoing'].includes(o.status)).length} active</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#408A71] text-[#B0E4CC] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={logout} className="p-2 rounded-lg border border-[#408A71] text-[#B0E4CC] hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-[#B0E4CC]">Pending</p>
            <p className="text-xl font-bold text-amber-400">{columnOrders('pending').length}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-xs text-[#B0E4CC]">Ongoing</p>
            <p className="text-xl font-bold text-blue-400">{columnOrders('ongoing').length}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-[#B0E4CC]">In Delivery</p>
            <p className="text-xl font-bold text-emerald-400">{columnOrders('in_delivery').length}</p>
          </div>
        </div>

        {/* Stale alert */}
        {staleOrders.length > 0 && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{staleOrders.length} order{staleOrders.length > 1 ? 's' : ''} pending longer than {STALE_THRESHOLD_MIN} minutes</p>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Kanban board */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COLUMNS.map(col => {
            const items = columnOrders(col.key)
            return (
              <div key={col.key} className={`rounded-2xl border ${col.border} ${col.bg} p-3`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-4 h-4 ${col.text}`} />
                    <span className="text-sm font-semibold text-white">{col.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text} font-medium`}>{items.length}</span>
                  </div>
                </div>

                <div className="space-y-2 min-h-[200px]">
                  {items.length === 0 && (
                    <p className="text-xs text-[#408A71] text-center py-8">No orders</p>
                  )}
                  {items.map(order => {
                    const totalQty = (order.items || []).reduce((s, i) => s + i.quantity, 0)
                    const minsOld = order.created_at ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) : 0
                    const isStale = col.key === 'pending' && minsOld >= STALE_THRESHOLD_MIN
                    return (
                      <div
                        key={order.id}
                        className={`rounded-xl border ${isStale ? 'border-red-500/40 bg-red-500/5' : 'border-[#408A71] bg-[#285A48]'} p-3 text-sm space-y-1.5`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${col.dot} ${isStale ? 'animate-pulse' : ''}`} />
                              <p className="font-semibold text-white truncate text-sm">{order.customer_name}</p>
                            </div>
                            <p className="text-[#408A71] text-xs truncate mt-0.5">{order.customer_contact}</p>
                          </div>
                          <span className="text-[#408A71] font-bold text-sm shrink-0">₱{order.total}</span>
                        </div>

                        {order.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3 h-3 text-[#408A71] mt-0.5 shrink-0" />
                            <p className="text-[10px] text-[#408A71] leading-relaxed line-clamp-2">{order.address}</p>
                          </div>
                        )}

                        <p className="text-[#B0E4CC] text-xs truncate">{totalQty} item{totalQty !== 1 ? 's' : ''}{order.items?.[0] ? ` · ${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}` : ''}</p>

                        <div className="flex items-center justify-between text-[10px] text-[#408A71]">
                          <span>{timeAgo(order.created_at)}</span>
                          {col.key === 'ongoing' && (
                            <button
                              onClick={() => handleReady(order.id)}
                              disabled={readyLoading === order.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#408A71] hover:bg-[#285A48] text-white font-semibold text-xs transition-all disabled:opacity-50"
                            >
                              {readyLoading === order.id ? '...' : <><CheckCircle className="w-3 h-3" /> Ready</>}
                            </button>
                          )}
                          {col.key === 'in_delivery' && order.rider_name && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <Bike className="w-3 h-3" />{order.rider_name}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Loading */}
        {loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-[#408A71] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#B0E4CC] text-sm">Loading orders...</p>
          </div>
        )}
      </div>
    </div>
  )
}