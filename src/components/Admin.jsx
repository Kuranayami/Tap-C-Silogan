import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Clock, User, Phone, MapPin, ArrowLeft, RefreshCw,
  ChevronDown, ChevronUp, LogOut, Edit3, Upload, Trash2, X, Save,
  Plus, Check, ImageIcon, Camera, AlertTriangle, TrendingUp, Bike,
  Zap, Navigation, Users, Wifi, XCircle, CheckCircle,
} from 'lucide-react'
import AdminLogin from './AdminLogin'
import { api, imageUrl } from '../api'

const COLUMNS = [
  { key: 'pending', label: 'Pending', icon: Clock, color: 'amber', bg: 'bg-amber-500/10', border: 'border-amber-500/25', dot: 'bg-amber-400', text: 'text-amber-400' },
  { key: 'ongoing', label: 'Ongoing', icon: Package, color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/25', dot: 'bg-blue-400', text: 'text-blue-400' },
  { key: 'in_delivery', label: 'In Delivery', icon: Bike, color: 'emerald', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', dot: 'bg-emerald-400', text: 'text-emerald-400' },
]

const STALE_THRESHOLD_MIN = 5

const adminHeaders = () => {
  const token = localStorage.getItem('admin_token')
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

const statusLabel = {
  pending: 'Pending',
  ongoing: 'Ongoing',
  in_delivery: 'In Delivery',
  done: 'Done',
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'))
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMenuManager, setShowMenuManager] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAboutManager, setShowAboutManager] = useState(false)
  const [showUsersManager, setShowUsersManager] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'ulam' })
  const [newImage, setNewImage] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', category: 'ulam' })
  const [editImage, setEditImage] = useState(null)
  const [aboutImages, setAboutImages] = useState([])
  const [uploadingAbout, setUploadingAbout] = useState(false)
  const [aboutFile, setAboutFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [heroImage, setHeroImage] = useState(null)
  const [heroFile, setHeroFile] = useState(null)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [activityFeed, setActivityFeed] = useState([])
  const [dragId, setDragId] = useState(null)
  const feedEndRef = useRef(null)
  const [riderStats, setRiderStats] = useState({ online: 0, busy: 0, idle: 0, total: 0 })
  const [activeUsers, setActiveUsers] = useState(0)
  const [kitchenProgress, setKitchenProgress] = useState({})

  const addActivity = useCallback((msg, type = 'info') => {
    const entry = { id: Date.now().toString(36), msg, type, time: new Date().toISOString() }
    setActivityFeed(prev => [entry, ...prev].slice(0, 50))
  }, [])

  const logout = () => {
    localStorage.removeItem('admin_token')
    setLoggedIn(false)
  }

  const fetchOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/orders'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setOrders(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchMenu = async () => {
    try {
      const res = await fetch(api('/api/menu'))
      if (res.ok) setMenuItems(await res.json())
    } catch {}
  }

  const fetchAboutImages = async () => {
    try {
      const res = await fetch(api('/api/about'))
      if (res.ok) setAboutImages(await res.json())
    } catch {}
  }

  const fetchHero = async () => {
    try {
      const res = await fetch(api('/api/config'))
      if (res.ok) { const d = await res.json(); setHeroImage(d.heroImage || null) }
    } catch {}
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(api('/api/admin/users'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setUsers(await res.json().then(d => d.users))
    } catch {} finally { setUsersLoading(false) }
  }

  const handleBanUser = async (id, status) => {
    try {
      const res = await fetch(api(`/api/admin/users/${id}/status`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) fetchUsers()
    } catch {}
  }

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(api(`/api/admin/users/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) fetchUsers()
    } catch {}
  }

  useEffect(() => {
    if (loggedIn) { fetchOrders(); fetchMenu(); fetchAboutImages(); fetchHero() }
  }, [loggedIn])

  useEffect(() => {
    if (!loggedIn) return
    const fetchRiderStats = async () => {
      try {
        const res = await fetch(api('/api/rider/stats'), { headers: adminHeaders() })
        if (res.ok) setRiderStats(await res.json())
      } catch {}
    }
    const fetchActiveUsers = () => {
      const today = new Date().toDateString()
      const unique = new Set(orders.filter(o => {
        const d = o.created_at ? new Date(o.created_at).toDateString() : ''
        return d === today
      }).map(o => o.customer_name?.toLowerCase().trim()).filter(Boolean))
      setActiveUsers(unique.size)
    }
    fetchRiderStats()
    fetchActiveUsers()
    const interval = setInterval(() => {
      fetchRiderStats()
      fetchActiveUsers()
    }, 30000)
    return () => clearInterval(interval)
  }, [loggedIn, orders])

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />

  const changeStatus = async (id, newStatus) => {
    const prev = orders.find(o => o.id === id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    if (prev && prev.status !== newStatus) {
      addActivity(`${prev.customer_name} → ${statusLabel[newStatus]}`, newStatus === 'pending' ? 'warning' : newStatus === 'in_delivery' ? 'success' : 'info')
    }
    try {
      const res = await fetch(api(`/api/orders/${id}`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prev?.status } : o)); return }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: updated.status } : o))
    } catch {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prev?.status } : o))
    }
  }

  const handleDragStart = (id) => setDragId(id)
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = async (colKey) => {
    if (dragId) { await changeStatus(dragId, colKey); setDragId(null) }
  }

  const handleDeleteOrder = async (id) => {
    if (!confirm('Delete this order permanently?')) return
    const order = orders.find(o => o.id === id)
    try {
      const res = await fetch(api(`/api/orders/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to delete')
      setOrders(prev => prev.filter(o => o.id !== id))
      if (order) addActivity(`${order.customer_name} order deleted`, 'warning')
    } catch (err) { console.error(err) }
  }

  const handleUploadAbout = async () => {
    if (!aboutFile) return
    setUploadError(''); setUploadingAbout(true)
    try {
      const fd = new FormData(); fd.append('image', aboutFile)
      const res = await fetch(api('/api/about'), { method: 'POST', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return }
      setAboutFile(null); fetchAboutImages()
    } catch (err) { setUploadError(err.message) } finally { setUploadingAbout(false) }
  }

  const handleDeleteAbout = async (id) => {
    if (!confirm('Delete this image?')) return
    try {
      const res = await fetch(api(`/api/about/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Delete failed')
      fetchAboutImages()
    } catch (err) { console.error(err) }
  }

  const handleUploadHero = async () => {
    if (!heroFile) return
    setUploadingHero(true)
    try {
      const fd = new FormData(); fd.append('image', heroFile)
      const res = await fetch(api('/api/config/hero'), { method: 'PUT', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError(d.error || 'Upload failed'); return }
      setHeroFile(null); setHeroImage(imageUrl(d.heroImage))
    } catch (err) { setUploadError(err.message) } finally { setUploadingHero(false) }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItem.name || !newItem.price || !newItem.category) return
    setAdding(true)
    try {
      const fd = new FormData()
      fd.append('name', newItem.name); fd.append('price', newItem.price); fd.append('category', newItem.category)
      if (newImage) fd.append('image', newImage)
      const res = await fetch(api('/api/menu'), { method: 'POST', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to add')
      setNewItem({ name: '', price: '', category: 'ulam' }); setNewImage(null); setShowAddForm(false); fetchMenu()
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  const startEdit = (item) => { setEditingId(item.id); setEditForm({ name: item.name, price: String(item.price), category: item.category }); setEditImage(null) }
  const cancelEdit = () => { setEditingId(null); setEditForm({ name: '', price: '', category: 'ulam' }); setEditImage(null) }

  const handleEdit = async (id) => {
    if (!editForm.name || !editForm.price || !editForm.category) return
    try {
      const fd = new FormData()
      fd.append('name', editForm.name); fd.append('price', editForm.price); fd.append('category', editForm.category)
      if (editImage) fd.append('image', editImage)
      const res = await fetch(api(`/api/menu/${id}`), { method: 'PATCH', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to update')
      cancelEdit(); fetchMenu()
    } catch (err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      const res = await fetch(api(`/api/menu/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to delete')
      fetchMenu()
    } catch (err) { console.error(err) }
  }

  const columnOrders = (key) => orders.filter(o => (o.status || 'pending') === key)
  const staleOrders = orders.filter(o => (o.status || 'pending') === 'pending' && o.created_at && (Date.now() - new Date(o.created_at).getTime()) > STALE_THRESHOLD_MIN * 60000)
  const activeRiders = orders.filter(o => o.status === 'in_delivery').length

  const goBack = () => { window.location.hash = '' }

  const STALE_FLASH_CLASS = 'animate-[pulse_1s_ease-in-out_infinite] border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]'

  const OrderCard = ({ order, colKey }) => {
    const totalQty = (order.items || []).reduce((s, i) => s + i.quantity, 0)
    const minsOld = order.created_at ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) : 0
    const isStale = colKey === 'pending' && minsOld >= STALE_THRESHOLD_MIN
    const col = COLUMNS.find(c => c.key === colKey)
    const kitchenStatus = order.kitchen_status || 'pending'
    const packingProgress = order.packing_progress || 0

    const kitchenLabel = kitchenStatus === 'pending' ? 'In queue' : kitchenStatus === 'preparing' ? 'Preparing' : kitchenStatus === 'packing' ? `Packing ${packingProgress}%` : kitchenStatus === 'ready' ? 'Ready for pickup' : ''
    const progressColor = kitchenStatus === 'preparing' ? 'bg-amber-400' : kitchenStatus === 'packing' ? 'bg-blue-400' : kitchenStatus === 'ready' ? 'bg-emerald-400' : 'bg-[#27272a]'
    const progressWidth = kitchenStatus === 'preparing' ? '40%' : kitchenStatus === 'packing' ? `${packingProgress}%` : kitchenStatus === 'ready' ? '100%' : '0%'

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(order.id)}
        onClick={() => {
          const next = colKey === 'pending' ? 'ongoing' : colKey === 'ongoing' ? 'in_delivery' : colKey === 'in_delivery' ? 'done' : null
          if (next === 'done' && !confirm('Mark this order as done?')) return
          if (next) changeStatus(order.id, next)
        }}
        className={`rounded-xl border ${isStale ? STALE_FLASH_CLASS + ' border-red-500/40 bg-red-500/5' : 'border-[#27272a] bg-[#18181b]'} p-3 cursor-grab active:cursor-grabbing hover:border-[#f97316]/30 transition-all text-sm space-y-1.5`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${col?.dot} ${isStale ? 'animate-pulse' : ''}`} />
              <p className="font-semibold text-white truncate text-sm">{order.customer_name}</p>
            </div>
            <p className="text-[#71717a] text-xs truncate mt-0.5">{order.customer_contact}</p>
          </div>
          <span className="text-[#f97316] font-bold text-sm shrink-0">₱{order.total}</span>
        </div>

        {/* Kitchen status bar (Ongoing) */}
        {colKey === 'ongoing' && kitchenStatus !== 'pending' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#a1a1aa]">{kitchenLabel}</span>
              <span className={`text-[10px] font-medium ${kitchenStatus === 'ready' ? 'text-emerald-400' : 'text-[#71717a]'}`}>{kitchenStatus === 'ready' ? '✓' : packingProgress + '%'}</span>
            </div>
            <div className="w-full h-1 rounded-full bg-[#27272a] overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: progressWidth }} />
            </div>
          </div>
        )}

        <p className="text-[#a1a1aa] text-xs truncate">{totalQty} item{totalQty !== 1 ? 's' : ''}{order.items?.[0] ? ` · ${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}` : ''}</p>

        {/* Rider name (In Delivery) */}
        {colKey === 'in_delivery' && order.rider_name && (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Bike className="w-3 h-3" />{order.rider_name}
          </p>
        )}

        <div className="flex items-center justify-between text-[10px] text-[#71717a]">
          <span>{timeAgo(order.created_at)}</span>
          <div className="flex items-center gap-1">
            {colKey !== 'done' && (
              <button
                onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'canceled') }}
                className="hover:text-red-400 transition-colors p-0.5 text-[10px] flex items-center gap-0.5"
                title="Cancel order"
              >
                <XCircle className="w-3 h-3" /> Cancel
              </button>
            )}
            {colKey === 'pending' && (
              <button
                onClick={(e) => { e.stopPropagation(); changeStatus(order.id, 'ongoing') }}
                className="hover:text-emerald-400 transition-colors p-0.5 text-[10px] flex items-center gap-0.5"
                title="Accept order"
              >
                <CheckCircle className="w-3 h-3" /> Accept
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id) }} className="hover:text-red-400 transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
    )
  }

  // Micro-analytics
  const bottleneckCount = staleOrders.length
  const pendingCount = columnOrders('pending').length
  const ongoingCount = columnOrders('ongoing').length
  const inDeliveryCount = columnOrders('in_delivery').length

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">Dashboard</span></h1>
              <p className="text-xs text-[#71717a]">{orders.length} orders · {menuItems.length} items</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowMenuManager(!showMenuManager)} className={`p-2 rounded-lg border transition-colors ${showMenuManager ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]' : 'border-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="Manage Menu"><Edit3 className="w-4 h-4" /></button>
            <button onClick={() => setShowAboutManager(!showAboutManager)} className={`p-2 rounded-lg border transition-colors ${showAboutManager ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]' : 'border-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="About Images"><ImageIcon className="w-4 h-4" /></button>
            <button onClick={() => { setShowUsersManager(!showUsersManager); if (!showUsersManager && users.length === 0) fetchUsers() }} className={`p-2 rounded-lg border transition-colors ${showUsersManager ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]' : 'border-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="Manage Users"><Users className="w-4 h-4" /></button>
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={logout} className="p-2 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        {/* ── Micro-Analytics Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
            <div className="flex items-center gap-2 text-[#a1a1aa] text-xs mb-1"><Users className="w-3.5 h-3.5 text-[#f97316]" />Active Users</div>
            <p className="text-2xl font-bold text-white">{activeUsers}</p>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
            <div className="flex items-center gap-2 text-[#a1a1aa] text-xs mb-1"><Bike className="w-3.5 h-3.5 text-emerald-400" />Riders</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{riderStats.online}</span>
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{riderStats.busy}</span>
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-[#71717a]" />{riderStats.idle}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#27272a] bg-[#18181b] p-4">
            <div className="flex items-center gap-2 text-[#a1a1aa] text-xs mb-1"><TrendingUp className="w-3.5 h-3.5 text-blue-400" />Avg. Preparation</div>
            <p className="text-2xl font-bold text-white">{ongoingCount > 0 ? '~12 min' : '—'}</p>
          </div>
          <div className={`rounded-xl border p-4 ${bottleneckCount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-[#27272a] bg-[#18181b]'}`}>
            <div className="flex items-center gap-2 text-[#a1a1aa] text-xs mb-1"><AlertTriangle className={`w-3.5 h-3.5 ${bottleneckCount > 0 ? 'text-red-400' : 'text-[#71717a]'}`} />Bottleneck</div>
            <p className={`text-2xl font-bold ${bottleneckCount > 0 ? 'text-red-400' : 'text-white'}`}>{bottleneckCount > 0 ? `${bottleneckCount} >${STALE_THRESHOLD_MIN}m` : 'None'}</p>
          </div>
        </div>

        {/* ── Menu / About / Hero Manager (collapsible) ── */}
        <AnimatePresence>
          {showMenuManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4 text-[#f97316]" />Manage Menu Items</h3>
                  <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold transition-all"><Plus className="w-3.5 h-3.5" />Add Item</button>
                </div>
                {showAddForm && (
                  <form onSubmit={handleAddItem} className="grid sm:grid-cols-5 gap-2 mb-3 p-3 rounded-xl bg-[#202024]">
                    <input type="text" placeholder="Name" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50" />
                    <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50" />
                    <select value={newItem.category} onChange={e => setNewItem(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50">
                      <option value="ulam">Ulam</option><option value="silog">Silog</option><option value="shake">Shake</option><option value="solo">Solo</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{newImage ? newImage.name : 'Image'}</span><input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} className="hidden" /></label>
                    <button type="submit" disabled={adding || !newItem.name || !newItem.price} className="px-3 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
                  </form>
                )}
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {menuItems.map(item => (
                    <div key={item.id} className="rounded-xl bg-[#202024] p-2.5">
                      {editingId === item.id ? (
                        <div className="grid sm:grid-cols-6 gap-2">
                          <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="col-span-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50" />
                          <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50" />
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50">
                            <option value="ulam">Ulam</option><option value="silog">Silog</option><option value="shake">Shake</option><option value="solo">Solo</option>
                          </select>
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors"><Upload className="w-3.5 h-3.5 shrink-0" /><span className="truncate text-xs">{editImage ? editImage.name : 'Image'}</span><input type="file" accept="image/*" onChange={e => setEditImage(e.target.files[0])} className="hidden" /></label>
                          <div className="flex items-center gap-1"><button onClick={() => handleEdit(item.id)} className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all"><Save className="w-3.5 h-3.5" /></button><button onClick={cancelEdit} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#18181b] overflow-hidden shrink-0"><img src={imageUrl(item.image) || 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=80&q=60'} alt="" className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{item.name}</p><p className="text-xs text-[#71717a]">₱{item.price} · {item.category}</p></div>
                          {(() => { const disabled = item.active === false; return (<button onClick={async () => { try { await fetch(api(`/api/menu/${item.id}`), { method: 'PATCH', headers: { ...adminHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: disabled }) }); fetchMenu() } catch {} }} className={['p-1.5 rounded-lg border transition-all', disabled ? 'bg-red-600/20 border-red-600/40 text-red-400' : 'border-[#27272a] text-[#a1a1aa] hover:text-green-400'].join(' ')} title={disabled ? 'Disabled' : 'Enabled'}><span className={['block w-3 h-3 rounded-full border-2 flex items-center justify-center', disabled ? 'border-red-400' : 'border-[#27272a]'].join(' ')}><span className={['block w-1.5 h-1.5 rounded-full', disabled ? 'bg-red-400' : 'bg-transparent'].join(' ')} /></span></button>)})()}
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-all" title="Edit"><Upload className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAboutManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm"><ImageIcon className="w-4 h-4 text-[#f97316]" />Manage About Images</h3>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202024] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{aboutFile ? aboutFile.name : 'Choose image'}</span><input type="file" accept="image/*" onChange={e => { setAboutFile(e.target.files[0]); setUploadError('') }} className="hidden" /></label>
                  <button onClick={handleUploadAbout} disabled={!aboutFile || uploadingAbout} className="px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50">{uploadingAbout ? 'Uploading...' : 'Upload'}</button>
                </div>
                {uploadError && <p className="text-red-400 text-xs mb-3">{uploadError}</p>}
                {aboutImages.length === 0 ? <p className="text-sm text-[#71717a] text-center py-4">No images uploaded yet.</p> : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {aboutImages.map(item => (
                      <div key={item.id} className="group relative rounded-xl overflow-hidden border border-[#27272a] bg-[#202024] aspect-square">
                        <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => handleDeleteAbout(item.id)} className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Users Manager ── */}
        <AnimatePresence>
          {showUsersManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-[#f97316]" />Manage Users</h3>
                  <button onClick={fetchUsers} disabled={usersLoading} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {users.length === 0 ? (
                  <p className="text-sm text-[#71717a] text-center py-4">{usersLoading ? 'Loading...' : 'No users found.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#71717a] text-xs border-b border-[#27272a]">
                          <th className="text-left py-2 pr-2">Name</th>
                          <th className="text-left py-2 pr-2">Email / Phone</th>
                          <th className="text-left py-2 pr-2">Provider</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Joined</th>
                          <th className="text-right py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} className="border-b border-[#27272a] hover:bg-[#202024] transition-colors">
                            <td className="py-2 pr-2 text-white font-medium truncate max-w-[120px]">{u.name || '—'}</td>
                            <td className="py-2 pr-2 text-[#a1a1aa] truncate max-w-[150px]">{u.email || u.phone || '—'}</td>
                            <td className="py-2 pr-2 text-[#a1a1aa] capitalize">{u.auth_provider || '—'}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${u.status === 'banned' ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : u.status === 'disabled' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                                <span className={`w-1 h-1 rounded-full
                                  ${u.status === 'banned' ? 'bg-red-400'
                                  : u.status === 'disabled' ? 'bg-amber-400'
                                  : 'bg-emerald-400'}`} />
                                {u.status || 'active'}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-[#71717a] text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(!u.status || u.status === 'active') ? (
                                  <button onClick={() => handleBanUser(u.id, 'disabled')} className="p-1 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-amber-400 hover:border-amber-400/30 transition-all" title="Disable">
                                    <Zap className="w-3.5 h-3.5" />
                                  </button>
                                ) : u.status === 'disabled' ? (
                                  <button onClick={() => handleBanUser(u.id, 'active')} className="p-1 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-emerald-400 hover:border-emerald-400/30 transition-all" title="Enable">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                                {u.status !== 'banned' ? (
                                  <button onClick={() => handleBanUser(u.id, 'banned')} className="p-1 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 hover:border-red-400/30 transition-all" title="Ban">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button onClick={() => handleBanUser(u.id, 'active')} className="p-1 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-emerald-400 hover:border-emerald-400/30 transition-all" title="Unban">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-1 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Board + Activity Feed ── */}
        <div className="flex gap-4">
          {/* Kanban */}
          <div className="flex-1 grid grid-cols-3 gap-3 min-h-[60vh]">
            {COLUMNS.map(col => {
              const items = columnOrders(col.key)
              const isOver = dragId && items.every(o => o.id !== dragId)
              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.key)}
                  className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-2 transition-all ${isOver ? 'ring-2 ring-[#f97316]/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <col.icon className={`w-4 h-4 ${col.text}`} />
                      <span className="text-sm font-semibold text-white">{col.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text} font-medium`}>{items.length}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
                    {items.length === 0 && <p className="text-xs text-[#71717a] text-center py-8">No orders</p>}
                    {items.map(order => <OrderCard key={order.id} order={order} colKey={col.key} />)}
                  </div>
                  {col.key === 'pending' && items.length > 0 && (
                    <button onClick={() => items.forEach(o => { if ((o.status || 'pending') === 'pending') changeStatus(o.id, 'ongoing') })} className="text-xs text-[#71717a] hover:text-white transition-colors py-1 text-center border-t border-[#27272a] mt-1">
                      Move all to Ongoing
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Activity Feed */}
          <div className="w-64 shrink-0 rounded-2xl border border-[#27272a] bg-[#18181b] p-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3"><Clock className="w-4 h-4 text-[#f97316]" />Activity</div>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs" ref={feedEndRef}>
              {activityFeed.length === 0 && <p className="text-[#71717a] text-center py-6">No activity yet</p>}
              {activityFeed.map(entry => (
                <div key={entry.id} className="flex items-start gap-2 pb-2 border-b border-[#27272a] last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${entry.type === 'success' ? 'bg-emerald-400' : entry.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <div>
                    <p className="text-[#a1a1aa]">{entry.msg}</p>
                    <p className="text-[#71717a] text-[10px] mt-0.5">{formatTime(entry.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Loading / Error / Empty ── */}
        {loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#a1a1aa] text-sm">Loading orders...</p>
          </div>
        )}

        {error && <div className="text-center py-12"><p className="text-red-400 text-sm">{error}</p></div>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
            <p className="text-[#a1a1aa] font-medium">No orders yet</p>
            <p className="text-xs text-[#71717a] mt-1">Orders will appear here once customers place them.</p>
          </div>
        )}
      </div>
    </div>
  )
}
