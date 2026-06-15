import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Package, Bike, User, LogOut, RefreshCw, CheckCircle, XCircle, ChefHat, Phone, MapPin, Timer, ListChecks, TrendingUp, AlertTriangle } from 'lucide-react'
import { api } from '../api'
import CashierLogin from './CashierLogin'
import { useOrderRealtime } from '../hooks/useOrderRealtime'

const COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400', text: 'text-amber-400' },
  { key: 'ongoing', label: 'Ongoing', icon: Package, color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400', text: 'text-blue-400' },
  { key: 'in_delivery', label: 'In Delivery', icon: Bike, color: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400', text: 'text-emerald-400' },
]

const cashierHeaders = () => {
  const token = localStorage.getItem('cashier_token')
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

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function CashierPanel() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('cashier_token'))
  const [cashier, setCashier] = useState(() => {
    try { const p = localStorage.getItem('cashier_profile'); return p ? JSON.parse(p) : null } catch { return null }
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const logout = useCallback(() => {
    localStorage.removeItem('cashier_token')
    localStorage.removeItem('cashier_profile')
    setLoggedIn(false)
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/cashier/orders'), { headers: cashierHeaders() })
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
    if (payload.eventType === 'INSERT') {
      setOrders(prev => [payload.new, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
    } else if (payload.eventType === 'DELETE') {
      setOrders(prev => prev.filter(o => o.id !== payload.old.id))
    }
  }, [loggedIn]))

  const changeStatus = async (id, newStatus) => {
    const prevOrder = orders.find(o => o.id === id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    try {
      const res = await fetch(api(`/api/cashier/orders/${id}`), {
        method: 'PATCH',
        headers: { ...cashierHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) {
        if (prevOrder) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prevOrder.status } : o))
        return
      }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: updated.status } : o))
    } catch {
      if (prevOrder) setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prevOrder.status } : o))
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this order?')) return
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'canceled' } : o))
    try {
      const res = await fetch(api(`/api/cashier/orders/${id}/cancel`), {
        method: 'PATCH',
        headers: cashierHeaders(),
      })
      if (res.status === 401) { logout(); return }
    } catch {}
  }

  const columnOrders = (key) => orders.filter(o => (o.status || 'pending') === key)
  const activeTotal = orders.filter(o => !['done', 'canceled'].includes(o.status || 'pending')).length
  const pendingCount = columnOrders('pending').length
  const ongoingCount = columnOrders('ongoing').length
  const deliveryCount = columnOrders('in_delivery').length

  if (!loggedIn) return <CashierLogin onLogin={() => { setLoggedIn(true); try { const p = localStorage.getItem('cashier_profile'); setCashier(p ? JSON.parse(p) : null) } catch {}; fetchOrders() }} />

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-[#f97316]/20">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cashier <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">Dashboard</span></h1>
              <p className="text-xs text-[#71717a]">{cashier?.name ? `${cashier.name} · ` : ''}{activeTotal} active orders</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <a href="#/cashier/profile" className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors" title="Profile">
              <User className="w-4 h-4" />
            </a>
            <button onClick={logout} className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Summary Bar ── */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3">
            <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[10px] mb-1"><Timer className="w-3 h-3 text-amber-400" />Pending</div>
            <p className="text-lg font-bold text-white">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3">
            <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[10px] mb-1"><Package className="w-3 h-3 text-blue-400" />Ongoing</div>
            <p className="text-lg font-bold text-white">{ongoingCount}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3">
            <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[10px] mb-1"><Bike className="w-3 h-3 text-emerald-400" />Delivery</div>
            <p className="text-lg font-bold text-white">{deliveryCount}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-3 col-span-3 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[#a1a1aa] text-[10px] mb-1"><TrendingUp className="w-3 h-3 text-[#f97316]" />Total Active</div>
            <p className="text-lg font-bold text-white">{activeTotal}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Kanban Board ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-h-[60vh]">
          {COLUMNS.map(col => {
            const items = columnOrders(col.key)
            return (
              <div key={col.key} className="flex flex-col rounded-2xl border border-[#27272a] bg-[#18181b] p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-4 h-4 ${col.text}`} />
                    <span className="text-sm font-semibold text-white">{col.label}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text}`}>{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
                  {loading && items.length === 0 ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded-xl border border-[#27272a] bg-[#202024] p-3 animate-pulse">
                          <div className="h-3 bg-[#27272a] rounded w-2/3 mb-2" />
                          <div className="h-2 bg-[#27272a] rounded w-1/2 mb-2" />
                          <div className="h-2 bg-[#27272a] rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-[#27272a] text-xs">
                      <col.icon className="w-8 h-8 mx-auto mb-1 opacity-30" />
                      No {col.label.toLowerCase()} orders
                    </div>
                  ) : (
                    <AnimatePresence>
                      {items.map(order => (
                        <motion.div
                          key={order.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="rounded-xl border border-[#27272a] bg-[#202024] p-3 cursor-pointer hover:border-[#f97316]/30 transition-colors"
                          onClick={() => {
                            if (col.key === 'pending') changeStatus(order.id, 'ongoing')
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-[#52525b]">#{String(order.id).slice(-4)}</span>
                              <Phone className="w-3 h-3 text-[#71717a]" />
                              <span className="text-xs text-[#a1a1aa]">{order.customer_contact || '—'}</span>
                            </div>
                            <span className="text-[10px] text-[#71717a]">{timeAgo(order.created_at)}</span>
                          </div>

                          <p className="text-sm font-semibold text-white mb-1.5 truncate">{order.customer_name || order.customer_contact}</p>

                          {order.address && (
                            <div className="flex items-start gap-1 mb-1.5">
                              <MapPin className="w-3 h-3 text-[#71717a] mt-0.5 shrink-0" />
                              <p className="text-[10px] text-[#71717a] leading-relaxed line-clamp-2">{order.address}</p>
                              {order.maps_link && (
                                <a href={order.maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-[#f97316] hover:underline shrink-0 ml-auto">
                                  Maps
                                </a>
                              )}
                            </div>
                          )}

                          {order.items && order.items.length > 0 && (
                            <div className="space-y-0.5 mb-2">
                              {order.items.slice(0, 4).map((item, i) => (
                                <p key={i} className="text-xs text-[#a1a1aa] truncate">
                                  {item.quantity || 1}x {item.name || item.menu_name || 'Item'}
                                </p>
                              ))}
                              {order.items.length > 4 && (
                                <p className="text-xs text-[#71717a]">+{order.items.length - 4} more</p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            {order.total !== undefined && (
                              <p className="text-sm font-bold text-[#f97316]">₱{Number(order.total).toLocaleString()}</p>
                            )}
                            <span className="text-[10px] text-[#52525b]">{formatTime(order.created_at)}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {col.key !== 'in_delivery' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(order.id) }}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"
                              >
                                <XCircle className="w-3 h-3" /> Cancel
                              </button>
                            )}
                            {col.key === 'pending' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'ongoing') }}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all"
                              >
                                <CheckCircle className="w-3 h-3" /> Accept
                              </button>
                            )}
                            {col.key === 'in_delivery' && (
                              <div className="flex-1 text-center py-1.5 text-[10px] text-emerald-400 font-medium">
                                Awaiting rider pickup
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
                {col.key === 'pending' && items.length > 1 && (
                  <button
                    onClick={() => items.forEach(o => changeStatus(o.id, 'ongoing'))}
                    className="mt-2 w-full py-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/30 text-xs font-medium transition-all"
                  >
                    Accept All ({items.length})
                  </button>
                )}

              </div>
            )
          })}
        </div>

        {/* ── Done & Canceled History ── */}
        {orders.some(o => ['done', 'canceled'].includes(o.status)) && (
          <details className="mt-6 rounded-2xl border border-[#27272a] bg-[#18181b]">
            <summary className="px-4 py-3 text-sm text-[#a1a1aa] cursor-pointer hover:text-white transition-colors flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#71717a]" />
              Done & Canceled ({orders.filter(o => ['done', 'canceled'].includes(o.status)).length})
            </summary>
            <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
              {orders.filter(o => ['done', 'canceled'].includes(o.status)).map(order => (
                <div key={order.id} className="flex items-center justify-between text-xs text-[#71717a] py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#52525b]">#{String(order.id).slice(-4)}</span>
                    <span className="truncate">{order.customer_name || order.customer_contact}</span>
                  </div>
                  <span className={order.status === 'done' ? 'text-emerald-400' : 'text-red-400'}>{order.status}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}
