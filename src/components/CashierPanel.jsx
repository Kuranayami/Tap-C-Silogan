import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Package, Bike, User, LogOut, RefreshCw, CheckCircle, XCircle, ChefHat, Phone, MapPin, Timer, ListChecks, TrendingUp, AlertTriangle, DollarSign, Zap, Shield } from 'lucide-react'
import { api, imageUrl } from '../api'
import CashierLogin from './CashierLogin'
import { useOrderRealtime } from '../hooks/useOrderRealtime'
import { updateDeliveryFees, fetchDeliveryFees } from '../data/deliveryZone'

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

function RescueHoldTimer({ holdUntil }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function tick() {
      const diff = new Date(holdUntil).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expired'); return }
      const min = Math.floor(diff / 60000)
      const sec = Math.floor((diff % 60000) / 1000)
      setRemaining(`${min}:${String(sec).padStart(2, '0')}`)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [holdUntil])

  return <span className="font-mono text-xs">{remaining}</span>
}

export default function CashierPanel() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('cashier_token'))
  const [cashier, setCashier] = useState(() => {
    try { const p = localStorage.getItem('cashier_profile'); return p ? JSON.parse(p) : null } catch { return null }
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deliveryFeeInZone, setDeliveryFeeInZoneLocal] = useState(40)
  const [deliveryFeeOutOfZone, setDeliveryFeeOutOfZoneLocal] = useState(80)
  const [deliveryFeeInZoneInput, setDeliveryFeeInZoneInput] = useState('40')
  const [deliveryFeeOutOfZoneInput, setDeliveryFeeOutOfZoneInput] = useState('80')
  const [savingDeliveryFee, setSavingDeliveryFee] = useState(false)
  const [showDeliveryFeeInput, setShowDeliveryFeeInput] = useState(false)
  const [rescueHolds, setRescueHolds] = useState([])
  const [rescueStats, setRescueStats] = useState({ totalHolds: 0, activeHolds: 0, totalMatches: 0, totalRefunds: 0 })
  const [showRescuePanel, setShowRescuePanel] = useState(false)

  const logout = useCallback(() => {
    localStorage.removeItem('cashier_token')
    localStorage.removeItem('cashier_profile')
    setLoggedIn(false)
  }, [])

  const fetchRescueHolds = useCallback(async () => {
    try {
      const res = await fetch(api('/api/cashier/rescue/holds'), { headers: cashierHeaders() })
      if (res.ok) setRescueHolds(await res.json())
    } catch {}
  }, [])

  const fetchRescueStats = useCallback(async () => {
    try {
      const res = await fetch(api('/api/cashier/rescue/stats'), { headers: cashierHeaders() })
      if (res.ok) setRescueStats(await res.json())
    } catch {}
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

  const fetchFee = useCallback(async () => {
    try {
      const fees = await fetchDeliveryFees()
      setDeliveryFeeInZoneLocal(fees.inZone)
      setDeliveryFeeOutOfZoneLocal(fees.outOfZone)
      setDeliveryFeeInZoneInput(String(fees.inZone))
      setDeliveryFeeOutOfZoneInput(String(fees.outOfZone))
    } catch {}
  }, [])

  useEffect(() => {
    if (loggedIn) { fetchOrders(); fetchFee(); fetchRescueHolds() }
  }, [loggedIn, fetchOrders, fetchFee, fetchRescueHolds])

  useEffect(() => {
    if (!loggedIn) return
    const interval = setInterval(fetchOrders, 15000)
    return () => clearInterval(interval)
  }, [loggedIn, fetchOrders])

  useEffect(() => {
    if (!loggedIn) return
    const interval = setInterval(fetchRescueHolds, 10000)
    return () => clearInterval(interval)
  }, [loggedIn, fetchRescueHolds])

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

  const handleSaveDeliveryFee = async () => {
    const inZone = Number(deliveryFeeInZoneInput)
    const outOfZone = Number(deliveryFeeOutOfZoneInput)
    if (isNaN(inZone) || inZone < 0 || isNaN(outOfZone) || outOfZone < 0) return
    setSavingDeliveryFee(true)
    try {
      const token = localStorage.getItem('cashier_token')
      await updateDeliveryFees({ inZone, outOfZone }, token)
      setDeliveryFeeInZoneLocal(inZone)
      setDeliveryFeeOutOfZoneLocal(outOfZone)
      setShowDeliveryFeeInput(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSavingDeliveryFee(false)
    }
  }

  const columnOrders = (key) => orders.filter(o => (o.status || 'pending') === key)
  const activeTotal = orders.filter(o => !['done', 'canceled'].includes(o.status || 'pending')).length
  const pendingCount = columnOrders('pending').length
  const ongoingCount = columnOrders('ongoing').length
  const deliveryCount = columnOrders('in_delivery').length

  if (!loggedIn) return <CashierLogin onLogin={() => { setLoggedIn(true); try { const p = localStorage.getItem('cashier_profile'); setCashier(p ? JSON.parse(p) : null) } catch {}; fetchOrders() }} />

  return (
    <div className="min-h-screen bg-[#37353E] text-[#D3DAD9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {cashier?.avatar_url ? (
              <img src={imageUrl(cashier.avatar_url)} alt="" className="w-10 h-10 rounded-xl object-cover border border-[#715A5A]" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#715A5A] to-[#D3DAD9] flex items-center justify-center shadow-lg shadow-[#715A5A]/20">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cashier <span className="bg-gradient-to-r from-[#715A5A] to-[#D3DAD9] bg-clip-text text-transparent">Dashboard</span></h1>
              <p className="text-xs text-[#715A5A] flex items-center gap-2">
                {cashier?.name ? <span className="text-[#D3DAD9]">{cashier.name}</span> : null}
                {cashier?.username ? <span className="text-[#715A5A]">@{cashier.username}</span> : null}
                {cashier?.id ? <span className="text-[#715A5A] font-mono">#{String(cashier.id).slice(0, 8)}</span> : null}
                <span className="text-[#715A5A]">·</span>
                <span>{activeTotal} active</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowDeliveryFeeInput(!showDeliveryFeeInput)} className="p-2 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-emerald-400 transition-colors" title="Delivery Fees: In ₱{deliveryFeeInZone} / Out ₱{deliveryFeeOutOfZone}">
              <DollarSign className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowRescuePanel(!showRescuePanel); if (!showRescuePanel) fetchRescueStats() }} className={`p-2 rounded-lg border transition-colors ${showRescuePanel ? 'bg-[#715A5A]/20 border-[#715A5A]/40 text-[#715A5A]' : 'border-[#715A5A] text-[#D3DAD9] hover:text-white'}`} title="Rescue System">
              <Shield className="w-4 h-4" />
            </button>
            <a href="#/cashier/profile" className="p-2 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-white transition-colors" title="Profile">
              <User className="w-4 h-4" />
            </a>
            <button onClick={logout} className="p-2 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Rescue Alert ── */}
        <AnimatePresence>
          {rescueHolds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4"
            >
              <div className="flex items-start gap-3">
                <Zap className="w-6 h-6 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-400 text-sm flex items-center gap-2">
                    Rescue Match Available
                    <span className="text-[10px] text-yellow-500/70 font-mono">{rescueHolds.length} hold{rescueHolds.length > 1 ? 's' : ''}</span>
                  </h3>
                  <p className="text-xs text-[#D3DAD9] mt-1">
                    These items from canceled orders can be matched to new orders with the same items
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {rescueHolds.map(hold => (
                      <div key={hold.id} className="flex items-center justify-between text-xs bg-[#44444E] rounded-lg px-3 py-2">
                        <div>
                          <span className="text-[#D3DAD9]">Order #{String(hold.order_id).slice(-4)}</span>
                          <span className="text-[#715A5A] ml-2">
                            {(hold.items || []).map(i => `${i.quantity || 1}x ${i.name}`).join(', ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer className="w-3 h-3 text-yellow-400" />
                          <RescueHoldTimer holdUntil={hold.hold_until} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Summary Bar ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3">
            <div className="flex items-center gap-1.5 text-[#D3DAD9] text-[10px] mb-1"><Timer className="w-3 h-3 text-amber-400" />Pending</div>
            <p className="text-lg font-bold text-white">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3">
            <div className="flex items-center gap-1.5 text-[#D3DAD9] text-[10px] mb-1"><Package className="w-3 h-3 text-blue-400" />Ongoing</div>
            <p className="text-lg font-bold text-white">{ongoingCount}</p>
          </div>
          <div className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3">
            <div className="flex items-center gap-1.5 text-[#D3DAD9] text-[10px] mb-1"><Bike className="w-3 h-3 text-emerald-400" />Delivery</div>
            <p className="text-lg font-bold text-white">{deliveryCount}</p>
          </div>
          <div className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3">
            <div className="flex items-center gap-1.5 text-[#D3DAD9] text-[10px] mb-1"><TrendingUp className="w-3 h-3 text-[#715A5A]" />Total Active</div>
            <p className="text-lg font-bold text-white">{activeTotal}</p>
          </div>
        </div>

        {/* ── Delivery Fee Manager ── */}
        <AnimatePresence>
          {showDeliveryFeeInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#715A5A] bg-[#44444E] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-emerald-400" />Delivery Fees</h3>
                  <span className="text-xs text-[#715A5A]">In: ₱{deliveryFeeInZone} · Out: ₱{deliveryFeeOutOfZone}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-2">
                  <div className="flex-1">
                    <label className="text-xs text-[#715A5A] mb-1 block">In Zone</label>
                    <input type="number" min="0" value={deliveryFeeInZoneInput} onChange={e => setDeliveryFeeInZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#44444E] border border-[#715A5A] text-white text-sm focus:outline-none focus:border-[#715A5A]/50" placeholder="In zone fee" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[#715A5A] mb-1 block">Out of Zone</label>
                    <input type="number" min="0" value={deliveryFeeOutOfZoneInput} onChange={e => setDeliveryFeeOutOfZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#44444E] border border-[#715A5A] text-white text-sm focus:outline-none focus:border-[#715A5A]/50" placeholder="Out of zone fee" />
                  </div>
                  <button onClick={handleSaveDeliveryFee} disabled={savingDeliveryFee} className="px-4 py-2 rounded-lg bg-[#715A5A] hover:bg-[#37353E] text-white font-semibold text-sm transition-all disabled:opacity-50 sm:self-end">{savingDeliveryFee ? 'Saving...' : 'Update'}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Rescue Panel ── */}
        <AnimatePresence>
          {showRescuePanel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#715A5A] bg-[#44444E] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm"><Shield className="w-4 h-4 text-[#715A5A]" />Rescue System</h3>
                  <button onClick={fetchRescueStats} className="p-1.5 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-white transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[#715A5A] bg-[#37353E] p-3">
                    <p className="text-[10px] text-[#715A5A] mb-1">Total Holds</p>
                    <p className="text-lg font-bold text-white">{rescueStats.totalHolds}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-[#37353E] p-3">
                    <p className="text-[10px] text-amber-400 mb-1">Active Holds</p>
                    <p className="text-lg font-bold text-white">{rescueStats.activeHolds}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-[#37353E] p-3">
                    <p className="text-[10px] text-emerald-400 mb-1">Matches</p>
                    <p className="text-lg font-bold text-white">{rescueStats.totalMatches}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-[#37353E] p-3">
                    <p className="text-[10px] text-blue-400 mb-1">Refunds</p>
                    <p className="text-lg font-bold text-white">{rescueStats.totalRefunds}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              <div key={col.key} className="flex flex-col rounded-2xl border border-[#715A5A] bg-[#44444E] p-3">
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
                        <div key={i} className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3 animate-pulse">
                          <div className="h-3 bg-[#715A5A] rounded w-2/3 mb-2" />
                          <div className="h-2 bg-[#715A5A] rounded w-1/2 mb-2" />
                          <div className="h-2 bg-[#715A5A] rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-[#715A5A] text-xs">
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
                          className="rounded-xl border border-[#715A5A] bg-[#44444E] p-3 cursor-pointer hover:border-[#715A5A]/30 transition-colors"
                          onClick={() => {
                            if (col.key === 'pending') changeStatus(order.id, 'ongoing')
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-[#715A5A]">#{String(order.id).slice(-4)}</span>
                              {order.express_badge && <Zap className="w-3 h-3 text-yellow-400" />}
                              <Phone className="w-3 h-3 text-[#715A5A]" />
                              <span className="text-xs text-[#D3DAD9]">{order.customer_contact || '—'}</span>
                            </div>
                            <span className="text-[10px] text-[#715A5A]">{timeAgo(order.created_at)}</span>
                          </div>

                          <p className="text-sm font-semibold text-white mb-1.5 truncate">{order.customer_name || order.customer_contact}</p>

                          {order.address && (
                            <div className="flex items-start gap-1 mb-1.5">
                              <MapPin className="w-3 h-3 text-[#715A5A] mt-0.5 shrink-0" />
                              <p className="text-[10px] text-[#715A5A] leading-relaxed line-clamp-2">{order.address}</p>
                              {order.maps_link && (
                                <a href={order.maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-[#715A5A] hover:underline shrink-0 ml-auto">
                                  Maps
                                </a>
                              )}
                            </div>
                          )}

                          {order.items && order.items.length > 0 && (
                            <div className="space-y-0.5 mb-2">
                              {order.items.slice(0, 4).map((item, i) => (
                                <p key={i} className="text-xs text-[#D3DAD9] truncate">
                                  {item.quantity || 1}x {item.name || item.menu_name || 'Item'}
                                </p>
                              ))}
                              {order.items.length > 4 && (
                                <p className="text-xs text-[#715A5A]">+{order.items.length - 4} more</p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            {order.total !== undefined && (
                              <p className="text-sm font-bold text-[#715A5A]">₱{Number(order.total).toLocaleString()}</p>
                            )}
                            <span className="text-[10px] text-[#715A5A]">{formatTime(order.created_at)}</span>
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
                    className="mt-2 w-full py-2 rounded-lg border border-[#715A5A] text-[#D3DAD9] hover:text-white hover:border-[#715A5A]/30 text-xs font-medium transition-all"
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
          <details className="mt-6 rounded-2xl border border-[#715A5A] bg-[#44444E]">
            <summary className="px-4 py-3 text-sm text-[#D3DAD9] cursor-pointer hover:text-white transition-colors flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#715A5A]" />
              Done & Canceled ({orders.filter(o => ['done', 'canceled'].includes(o.status)).length})
            </summary>
            <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
              {orders.filter(o => ['done', 'canceled'].includes(o.status)).map(order => (
                <div key={order.id} className="flex items-center justify-between text-xs text-[#715A5A] py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#715A5A]">#{String(order.id).slice(-4)}</span>
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
