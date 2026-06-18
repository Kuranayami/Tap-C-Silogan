import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Package, Bike, User, LogOut, RefreshCw, CheckCircle, XCircle, ChefHat, Phone, MapPin, Timer, ListChecks, TrendingUp, AlertTriangle, DollarSign, Zap, Shield } from 'lucide-react'
import { api, imageUrl } from '../api'
import CashierLogin from './CashierLogin'
import { useOrderRealtime } from '../hooks/useOrderRealtime'
import { useConfirm } from '../hooks/useConfirm'
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

  const { confirm, ConfirmDialog } = useConfirm()

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
    if (!(await confirm('Cancel this order?'))) return
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
    <div className="min-h-screen bg-[#FFFBDA] text-[#4A3728]">
      <ConfirmDialog />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* â”€â”€ Header â”€â”€ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {cashier?.avatar_url ? (
              <img src={imageUrl(cashier.avatar_url)} alt="" className="w-10 h-10 rounded-xl object-cover border border-[#FFEC9E]" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D48040] to-[#4A3728] flex items-center justify-center shadow-lg shadow-[#D48040]/20">
                <ChefHat className="w-5 h-5 text-[#4A3728]" />
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cashier <span className="bg-gradient-to-r from-[#D48040] to-[#4A3728] bg-clip-text text-transparent">Dashboard</span></h1>
              <p className="text-xs text-[#D48040] flex items-center gap-2">
                {cashier?.name ? <span className="text-[#4A3728]">{cashier.name}</span> : null}
                {cashier?.username ? <span className="text-[#D48040]">@{cashier.username}</span> : null}
                {cashier?.id ? <span className="text-[#D48040] font-mono">#{String(cashier.id).slice(0, 8)}</span> : null}
                <span className="text-[#D48040]">-</span>
                <span>{activeTotal} active</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setShowDeliveryFeeInput(!showDeliveryFeeInput)} className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-emerald-400 hover:border-emerald-400/30 transition-colors" title="Delivery Fees: In P{deliveryFeeInZone} / Out P{deliveryFeeOutOfZone}">
              <DollarSign className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowRescuePanel(!showRescuePanel); if (!showRescuePanel) fetchRescueStats() }} className={`p-2 rounded-lg border transition-colors ${showRescuePanel ? 'bg-[#D48040]/20 border-[#D48040]/40 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Rescue System">
              <Shield className="w-4 h-4" />
            </button>
            <a href="#/cashier/profile" className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors" title="Profile">
              <User className="w-4 h-4" />
            </a>
            <button onClick={logout} className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* â”€â”€ Rescue Alert â”€â”€ */}
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
                  <p className="text-xs text-[#4A3728] mt-1">
                    These items from canceled orders can be matched to new orders with the same items
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {rescueHolds.map(hold => (
                      <div key={hold.id} className="flex items-center justify-between text-xs bg-[#FFFBDA] rounded-lg px-3 py-2">
                        <div>
                          <span className="text-[#4A3728]">Order #{String(hold.order_id).slice(-4)}</span>
                          <span className="text-[#D48040] ml-2">
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

        {/* â”€â”€ Summary Bar â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
            <div className="flex items-center gap-1.5 text-[#4A3728] text-[10px] mb-1"><Timer className="w-3 h-3 text-amber-400" />Pending</div>
            <p className="text-lg font-bold text-[#4A3728]">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
            <div className="flex items-center gap-1.5 text-[#4A3728] text-[10px] mb-1"><Package className="w-3 h-3 text-blue-400" />Ongoing</div>
            <p className="text-lg font-bold text-[#4A3728]">{ongoingCount}</p>
          </div>
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
            <div className="flex items-center gap-1.5 text-[#4A3728] text-[10px] mb-1"><Bike className="w-3 h-3 text-emerald-400" />Delivery</div>
            <p className="text-lg font-bold text-[#4A3728]">{deliveryCount}</p>
          </div>
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
            <div className="flex items-center gap-1.5 text-[#4A3728] text-[10px] mb-1"><TrendingUp className="w-3 h-3 text-[#D48040]" />Total Active</div>
            <p className="text-lg font-bold text-[#4A3728]">{activeTotal}</p>
          </div>
        </div>

        {/* â”€â”€ Delivery Fee Manager â”€â”€ */}
        <AnimatePresence>
          {showDeliveryFeeInput && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-emerald-400" />Delivery Fees</h3>
                  <span className="text-xs text-[#D48040]">In: P{deliveryFeeInZone} - Out: P{deliveryFeeOutOfZone}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mb-2">
                  <div className="flex-1">
                    <label className="text-xs text-[#D48040] mb-1 block">In Zone</label>
                    <input type="number" min="0" value={deliveryFeeInZoneInput} onChange={e => setDeliveryFeeInZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="In zone fee" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[#D48040] mb-1 block">Out of Zone</label>
                    <input type="number" min="0" value={deliveryFeeOutOfZoneInput} onChange={e => setDeliveryFeeOutOfZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="Out of zone fee" />
                  </div>
                  <button onClick={handleSaveDeliveryFee} disabled={savingDeliveryFee} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50 sm:self-end">{savingDeliveryFee ? 'Saving...' : 'Update'}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Rescue Panel â”€â”€ */}
        <AnimatePresence>
          {showRescuePanel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Shield className="w-4 h-4 text-[#D48040]" />Rescue System</h3>
                  <button onClick={fetchRescueStats} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-[#D48040] mb-1">Total Holds</p>
                    <p className="text-lg font-bold text-[#4A3728]">{rescueStats.totalHolds}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-amber-400 mb-1">Active Holds</p>
                    <p className="text-lg font-bold text-[#4A3728]">{rescueStats.activeHolds}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-emerald-400 mb-1">Matches</p>
                    <p className="text-lg font-bold text-[#4A3728]">{rescueStats.totalMatches}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-blue-400 mb-1">Refunds</p>
                    <p className="text-lg font-bold text-[#4A3728]">{rescueStats.totalRefunds}</p>
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

        {/* â”€â”€ Kanban Board â”€â”€ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-h-[60vh]">
          {COLUMNS.map(col => {
            const items = columnOrders(col.key)
            return (
              <div key={col.key} className="flex flex-col rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-4 h-4 ${col.text}`} />
                    <span className="text-sm font-semibold text-[#4A3728]">{col.label}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text}`}>{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
                  {loading && items.length === 0 ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => (
                        <div key={i} className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3 animate-pulse">
                          <div className="h-3 bg-[#D48040] rounded w-2/3 mb-2" />
                          <div className="h-2 bg-[#D48040] rounded w-1/2 mb-2" />
                          <div className="h-2 bg-[#D48040] rounded w-3/4" />
                        </div>
                      ))}
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-[#D48040] text-xs">
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
                          className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3 cursor-pointer hover:border-[#FFBB70]/30 transition-colors"
                          onClick={() => {
                            if (col.key === 'pending') changeStatus(order.id, 'ongoing')
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-[#D48040]">#{String(order.id).slice(-4)}</span>
                              {order.express_badge && <Zap className="w-3 h-3 text-yellow-400" />}
                              <Phone className="w-3 h-3 text-[#D48040]" />
                              <span className="text-xs text-[#4A3728]">{order.customer_contact || '-'}</span>
                            </div>
                            <span className="text-[10px] text-[#D48040]">{timeAgo(order.created_at)}</span>
                          </div>

                          <p className="text-sm font-semibold text-[#4A3728] mb-1.5 truncate">{order.customer_name || order.customer_contact}</p>

                          {order.address && (
                            <div className="flex items-start gap-1 mb-1.5">
                              <MapPin className="w-3 h-3 text-[#D48040] mt-0.5 shrink-0" />
                              <p className="text-[10px] text-[#D48040] leading-relaxed line-clamp-2">{order.address}</p>
                              {order.maps_link && (
                                <a href={order.maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-[#D48040] hover:underline shrink-0 ml-auto">
                                  Maps
                                </a>
                              )}
                            </div>
                          )}
                          {order.in_zone === true && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span className="text-[10px] text-emerald-400">In zone</span>
                            </div>
                          )}
                          {order.in_zone === false && (
                            <div className="flex items-center gap-1 mb-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                              <span className="text-[10px] text-red-400">Out of zone</span>
                            </div>
                          )}

                          {order.items && order.items.length > 0 && (
                            <div className="space-y-0.5 mb-2">
                              {order.items.slice(0, 4).map((item, i) => (
                                <p key={i} className="text-xs text-[#4A3728] truncate">
                                  {item.quantity || 1}x {item.name || item.menu_name || 'Item'}
                                </p>
                              ))}
                              {order.items.length > 4 && (
                                <p className="text-xs text-[#D48040]">+{order.items.length - 4} more</p>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            {order.total !== undefined && (
                              <p className="text-sm font-bold text-[#D48040]">P{Number(order.total).toLocaleString()}</p>
                            )}
                            <span className="text-[10px] text-[#D48040]">{formatTime(order.created_at)}</span>
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
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[#4A3728] text-xs font-medium transition-all"
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
                    className="mt-2 w-full py-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] hover:border-[#FFBB70]/30 text-xs font-medium transition-all"
                  >
                    Accept All ({items.length})
                  </button>
                )}

              </div>
            )
          })}
        </div>

        {/* â”€â”€ Done & Canceled History â”€â”€ */}
        {orders.some(o => ['done', 'canceled'].includes(o.status)) && (
          <details className="mt-6 rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA]">
            <summary className="px-4 py-3 text-sm text-[#4A3728] cursor-pointer hover:text-[#4A3728] transition-colors flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#D48040]" />
              Done & Canceled ({orders.filter(o => ['done', 'canceled'].includes(o.status)).length})
            </summary>
            <div className="px-4 pb-3 space-y-1.5 max-h-48 overflow-y-auto">
              {orders.filter(o => ['done', 'canceled'].includes(o.status)).map(order => (
                <div key={order.id} className="flex items-center justify-between text-xs text-[#D48040] py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#D48040]">#{String(order.id).slice(-4)}</span>
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


