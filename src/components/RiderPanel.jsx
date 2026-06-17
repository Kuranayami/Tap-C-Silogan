import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bike, Clock, MapPin, Phone, User, Package, Check, AlertTriangle,
  LogOut, Navigation, RefreshCw, Zap, ArrowLeft, XCircle,
} from 'lucide-react'
import { api, imageUrl } from '../api'
import RiderLogin from './RiderLogin'

const riderHeaders = () => {
  const token = localStorage.getItem('rider_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const min = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  return `${Math.floor(min / 60)}h ${min % 60}m ago`
}

export default function RiderPanel() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('rider_token'))
  const [rider, setRider] = useState(() => {
    try { return JSON.parse(localStorage.getItem('rider_profile')) }
    catch { return null }
  })
  const [readyOrders, setReadyOrders] = useState([])
  const [activeOrders, setActiveOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState(null)
  const [status, setStatus] = useState(() => {
    try { const p = localStorage.getItem('rider_profile'); return p ? (JSON.parse(p).status || 'online') : 'online' }
    catch { return 'online' }
  })
  const [notification, setNotification] = useState(null)
  const [activeTab, setActiveTab] = useState('pool') // 'pool' | 'active'
  const [error, setError] = useState('')

  const showNotification = useCallback((msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }, [])

  const fetchReadyOrders = useCallback(async () => {
    try {
      const res = await fetch(api('/api/rider/ready-orders'), { headers: riderHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setReadyOrders(await res.json())
    } catch {}
  }, [])

  const fetchActiveOrders = useCallback(async () => {
    try {
      const res = await fetch(api('/api/rider/my-orders'), { headers: riderHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setActiveOrders(await res.json())
    } catch {}
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/rider/profile'), { headers: riderHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) {
        const profile = await res.json()
        setStatus(profile.status || 'online')
        setRider(profile)
        localStorage.setItem('rider_profile', JSON.stringify(profile))
      }
    } catch {}
    await Promise.all([fetchReadyOrders(), fetchActiveOrders()])
    setLoading(false)
  }, [fetchReadyOrders, fetchActiveOrders])

  useEffect(() => {
    if (loggedIn) fetchAll()
  }, [loggedIn])

  useEffect(() => {
    if (!loggedIn) return
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [loggedIn, fetchAll])

  const logout = () => {
    localStorage.removeItem('rider_token')
    localStorage.removeItem('rider_profile')
    setLoggedIn(false)
    setRider(null)
  }

  const goBack = () => { window.location.hash = '' }

  const handleCancel = async (orderId) => {
    if (!confirm('Cancel this delivery?')) return
    try {
      const res = await fetch(api('/api/rider/cancel'), {
        method: 'POST',
        headers: { ...riderHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!res.ok) throw new Error('Failed to cancel')
      showNotification('Delivery canceled')
      fetchActiveOrders()
      fetchReadyOrders()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleClaim = async (orderId) => {
    setClaimingId(orderId)
    try {
      const res = await fetch(api('/api/rider/claim'), {
        method: 'POST',
        headers: { ...riderHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to claim')
      }

      const data = await res.json()
      showNotification(`✅ Claimed! SMS sent to ${data.order.customer_name} — rider ${rider?.name || 'en route'}!`)
      setActiveTab('active')
      fetchReadyOrders()
      fetchActiveOrders()
    } catch (err) {
      setError(err.message)
    } finally {
      setClaimingId(null)
    }
  }

  const handleDeliver = async (orderId) => {
    try {
      const res = await fetch(api('/api/rider/deliver'), {
        method: 'POST',
        headers: { ...riderHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!res.ok) throw new Error('Failed to mark delivered')
      showNotification(`✅ Order #${String(orderId).slice(-4)} delivered!`)
      fetchActiveOrders()
      fetchReadyOrders()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleStatusToggle = async () => {
    const next = status === 'online' ? 'idle' : 'online'
    try {
      const res = await fetch(api('/api/rider/status'), {
        method: 'POST',
        headers: { ...riderHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const data = res.ok ? null : await res.json().catch(() => null)
      if (res.ok) {
        setStatus(next)
        const existing = JSON.parse(localStorage.getItem('rider_profile') || '{}')
        localStorage.setItem('rider_profile', JSON.stringify({ ...existing, status: next }))
        showNotification(`Status changed to ${next}`, 'success')
      } else {
        showNotification(data?.error || 'Failed to change status', 'error')
      }
    } catch {
      showNotification('Network error changing status', 'error')
    }
  }

  if (!loggedIn) return <RiderLogin onLogin={(r) => { setRider(r); setLoggedIn(true); setStatus(r.status || 'online') }} />

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium whitespace-nowrap"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            {rider?.avatar_url ? (
              <img src={imageUrl(rider.avatar_url)} alt="" className="w-10 h-10 rounded-xl object-cover border border-[#27272a]" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Bike className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
                <Bike className="w-5 h-5 text-emerald-400" />
                Rider <span className="text-emerald-400">Panel</span>
              </h1>
              <p className="text-xs text-[#71717a] flex items-center gap-2">
                {rider?.name ? <span className="text-white">{rider.name}</span> : null}
                {rider?.email ? <span className="text-[#71717a]">{rider.email}</span> : null}
                {rider?.id ? <span className="text-[#52525b] font-mono">#{String(rider.id).slice(0, 8)}</span> : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleStatusToggle}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg ${
                status === 'online'
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30 hover:bg-emerald-500'
                  : 'bg-[#27272a] text-[#71717a] hover:bg-[#3f3f46] hover:text-white'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${status === 'online' ? 'bg-white animate-pulse' : 'bg-[#71717a]'}`} />
              {status === 'online' ? '🟢 Online' : status === 'busy' ? '🔵 Busy' : '⚪ Idle'}
            </button>
            <a href="#/rider/profile" className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors" title="Profile">
              <User className="w-4 h-4" />
            </a>
            <button onClick={logout} className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-center">
            <p className="text-xs text-[#71717a]">Available</p>
            <p className="text-lg font-bold text-white">{readyOrders.length}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-center">
            <p className="text-xs text-[#71717a]">Active</p>
            <p className="text-lg font-bold text-emerald-400">{activeOrders.length}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3 text-center">
            <p className="text-xs text-[#71717a]">Total Delivered</p>
            <p className="text-lg font-bold text-white">{rider?.total_deliveries || 0}</p>
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('pool')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'pool' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#71717a] border border-[#27272a] hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 inline mr-1" />Pickup Pool ({readyOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#71717a] border border-[#27272a] hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 inline mr-1" />Active ({activeOrders.length})
          </button>
          <button onClick={fetchAll} disabled={loading} className="ml-auto p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {/* Pickup Pool */}
        {activeTab === 'pool' && (
          <>
            {loading && readyOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-[#a1a1aa] text-sm">Checking for orders...</p>
              </div>
            ) : readyOrders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
                <p className="text-[#a1a1aa] font-medium">No orders ready yet</p>
                <p className="text-xs text-[#71717a] mt-1">Waiting for kitchen to mark orders as ready</p>
              </div>
            ) : (
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-emerald-500/20 bg-[#18181b] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <h3 className="font-semibold text-white truncate">{order.customer_name}</h3>
                        </div>
                        <p className="text-xs text-[#71717a] flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {order.address}
                        </p>
                        <p className="text-xs text-[#71717a] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {order.customer_contact}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-[#a1a1aa]">
                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                          </span>
                          <span className="text-[10px] text-[#71717a]">
                            · {timeAgo(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-emerald-400">₱{order.total}</p>
                        <button
                          onClick={() => handleClaim(order.id)}
                          disabled={claimingId === order.id}
                          className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          {claimingId === order.id ? (
                            <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Claiming...</>
                          ) : (
                            <><Zap className="w-3.5 h-3.5" /> Claim Delivery</>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Active Orders */}
        {activeTab === 'active' && (
          <>
            {activeOrders.length === 0 ? (
              <div className="text-center py-16">
                <Bike className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
                <p className="text-[#a1a1aa] font-medium">No active deliveries</p>
                <p className="text-xs text-[#71717a] mt-1">Claim an order from the Pickup Pool</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <h3 className="font-semibold text-white truncate">{order.customer_name}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium">In Delivery</span>
                        </div>
                        <p className="text-xs text-[#71717a] flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {order.address}
                        </p>
                        {order.maps_link && (
                          <a
                            href={order.maps_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 mt-1"
                          >
                            <Navigation className="w-3 h-3" /> Navigate
                          </a>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-white">₱{order.total}</p>
                        <p className="text-[10px] text-[#71717a] mt-0.5">{timeAgo(order.claimed_at)}</p>
                        <div className="flex items-center gap-2 mt-2 justify-end">
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition-all"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Cancel
                          </button>
                          <button
                            onClick={() => handleDeliver(order.id)}
                            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark Delivered
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
