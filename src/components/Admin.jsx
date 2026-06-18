import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Clock, User, Phone, MapPin, ArrowLeft, RefreshCw,
  ChevronDown, ChevronUp, LogOut, Edit3, Upload, Trash2, X, Save,
  Plus, Check, ImageIcon, Camera, AlertTriangle, TrendingUp, Bike, ChefHat,
  Zap, Navigation, Users, Wifi, XCircle, CheckCircle, Star, MessageSquare, ListChecks, DollarSign, Map, Search, Eye, EyeOff, Bell, Shield,
} from 'lucide-react'
import AdminLogin from './AdminLogin'
import { api, imageUrl } from '../api'
import { useOrderRealtime } from '../hooks/useOrderRealtime'
import { supabase } from '../lib/supabase'
import { updateDeliveryFees } from '../data/deliveryZone'

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
  canceled: 'Canceled',
}

const STALE_FLASH_CLASS = 'animate-[pulse_1s_ease-in-out_infinite] border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]'

const OrderCard = memo(({ order, colKey, onChangeStatus, onDeleteOrder, onDragStart }) => {
  const totalQty = (order.items || []).reduce((s, i) => s + i.quantity, 0)
  const minsOld = order.created_at ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000) : 0
  const isStale = colKey === 'pending' && minsOld >= STALE_THRESHOLD_MIN
  const col = COLUMNS.find(c => c.key === colKey)
  const kitchenStatus = order.kitchen_status || 'pending'
  const packingProgress = order.packing_progress || 0

  const kitchenLabel = kitchenStatus === 'pending' ? 'In queue' : kitchenStatus === 'preparing' ? 'Preparing' : kitchenStatus === 'packing' ? `Packing ${packingProgress}%` : kitchenStatus === 'ready' ? 'Ready for pickup' : ''
  const progressColor = kitchenStatus === 'preparing' ? 'bg-amber-400' : kitchenStatus === 'packing' ? 'bg-blue-400' : kitchenStatus === 'ready' ? 'bg-emerald-400' : 'bg-[#D48040]'
  const progressWidth = kitchenStatus === 'preparing' ? '40%' : kitchenStatus === 'packing' ? `${packingProgress}%` : kitchenStatus === 'ready' ? '100%' : '0%'

  return (
    <div
      draggable
      onDragStart={() => onDragStart(order.id)}
      onClick={() => {
        const next = colKey === 'pending' ? 'ongoing' : colKey === 'ongoing' ? 'in_delivery' : colKey === 'in_delivery' ? 'done' : null
        if (next === 'done' && !confirm('Mark this order as done?')) return
        if (next) onChangeStatus(order.id, next)
      }}
      className={`rounded-xl border ${isStale ? STALE_FLASH_CLASS + ' border-red-500/40 bg-red-500/5' : 'border-[#FFEC9E] bg-[#FFFBDA]'} p-3 cursor-grab active:cursor-grabbing hover:border-[#FFBB70]/30 transition-all text-sm space-y-1.5`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${col?.dot} ${isStale ? 'animate-pulse' : ''}`} />
            <p className="font-semibold text-[#4A3728] truncate text-sm">{order.customer_name}</p>
          </div>
          <p className="text-[#4A3728]/60 text-xs truncate mt-0.5">{order.customer_contact}</p>
        </div>
        <span className="text-[#4A3728] font-bold text-sm shrink-0">P{order.total}</span>
      </div>

      {order.address && (
        <div className="flex items-start gap-1.5">
          <MapPin className="w-3 h-3 text-[#4A3728]/60 mt-0.5 shrink-0" />
          <p className="text-[10px] text-[#4A3728]/60 leading-relaxed line-clamp-2">{order.address}</p>
          {order.maps_link && (
            <a href={order.maps_link} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-[#4A3728]/60 hover:text-[#D48040] hover:underline shrink-0 ml-auto">
              Maps
            </a>
          )}
        </div>
      )}

      {colKey === 'ongoing' && kitchenStatus !== 'pending' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#4A3728]/80">{kitchenLabel}</span>
            <span className={`text-[10px] font-medium ${kitchenStatus === 'ready' ? 'text-emerald-400' : 'text-[#4A3728]/60'}`}>{kitchenStatus === 'ready' ? '✓' : packingProgress + '%'}</span>
          </div>
          <div className="w-full h-1 rounded-full bg-[#FFEC9E] overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: progressWidth }} />
          </div>
        </div>
      )}

      <p className="text-[#4A3728]/80 text-xs truncate">{totalQty} item{totalQty !== 1 ? 's' : ''}{order.items?.[0] ? ` - ${order.items[0].name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}` : ''}</p>

      {colKey === 'in_delivery' && order.rider_name && (
        <p className="text-[10px] text-emerald-400 flex items-center gap-1">
          <Bike className="w-3 h-3" />{order.rider_name}
        </p>
      )}

      <div className="flex items-center justify-between text-[10px] text-[#4A3728]/60">
        <span>{timeAgo(order.created_at)}</span>
        <div className="flex items-center gap-1">
          {colKey !== 'done' && (
            <button
              onClick={(e) => { e.stopPropagation(); onChangeStatus(order.id, 'canceled') }}
              className="hover:text-red-400 transition-colors p-0.5 text-[10px] flex items-center gap-0.5"
              title="Cancel order"
            >
              <XCircle className="w-3 h-3" /> Cancel
            </button>
          )}
          {colKey === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); onChangeStatus(order.id, 'ongoing') }}
              className="hover:text-emerald-400 transition-colors p-0.5 text-[10px] flex items-center gap-0.5"
              title="Accept order"
            >
              <CheckCircle className="w-3 h-3" /> Accept
            </button>
          )}
          {colKey === 'ongoing' && (
            <button
              onClick={(e) => { e.stopPropagation(); onChangeStatus(order.id, 'in_delivery') }}
              className="hover:text-blue-400 transition-colors p-0.5 text-[10px] flex items-center gap-0.5"
              title="Mark as ready for delivery"
            >
              <Package className="w-3 h-3" /> Ready
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onDeleteOrder(order.id) }} className="hover:text-red-400 transition-colors p-0.5"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  )
})

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'))
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showMenuManager, setShowMenuManager] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAboutManager, setShowAboutManager] = useState(false)
  const [showHeroManager, setShowHeroManager] = useState(false)
  const [showUsersManager, setShowUsersManager] = useState(false)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'ulam' })
  const [newImage, setNewImage] = useState(null)
  const [adding, setAdding] = useState(false)
  const [clearing, setClearing] = useState(false)
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
  const [heroDishName, setHeroDishName] = useState('Lechon Kawali')
  const [heroDishPrice, setHeroDishPrice] = useState('140')
  const [activityFeed, setActivityFeed] = useState([])
  const [dragId, setDragId] = useState(null)
  const feedEndRef = useRef(null)
  const [riderStats, setRiderStats] = useState({ online: 0, busy: 0, idle: 0, total: 0 })
  const [activeUsers, setActiveUsers] = useState(0)
  const [kitchenProgress, setKitchenProgress] = useState({})
  const [showRidersManager, setShowRidersManager] = useState(false)
  const [riders, setRiders] = useState([])
  const [ridersLoading, setRidersLoading] = useState(false)
  const [showCashiersManager, setShowCashiersManager] = useState(false)
  const [cashiers, setCashiers] = useState([])
  const [cashiersLoading, setCashiersLoading] = useState(false)
  const [newCashier, setNewCashier] = useState({ name: '', username: '', password: '' })
  const [addingCashier, setAddingCashier] = useState(false)
  const [showCashierPassword, setShowCashierPassword] = useState(false)
  const [newRider, setNewRider] = useState({ name: '', phone: '', password: '', email: '', vehicle_type: 'motorcycle', license_plate: '' })
  const [addingRider, setAddingRider] = useState(false)
  const [showRiderPassword, setShowRiderPassword] = useState(false)
  const [showRestaurantsManager, setShowRestaurantsManager] = useState(false)
  const [restaurants, setRestaurants] = useState([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(false)
  const [newRestaurant, setNewRestaurant] = useState({ name: '', username: '', password: '' })
  const [addingRestaurant, setAddingRestaurant] = useState(false)
  const [showRestaurantPassword, setShowRestaurantPassword] = useState(false)
  const [showTestimonialsManager, setShowTestimonialsManager] = useState(false)
  const [testimonials, setTestimonials] = useState([])
  const [testimonialsForm, setTestimonialsForm] = useState({ name: '', text: '', rating: 5 })
  const [editingTestimonialIdx, setEditingTestimonialIdx] = useState(null)
  const [showDeliveryFeeManager, setShowDeliveryFeeManager] = useState(false)
  const [deliveryFeeInZone, setDeliveryFeeInZoneLocal] = useState(40)
  const [deliveryFeeOutOfZone, setDeliveryFeeOutOfZoneLocal] = useState(80)
  const [deliveryFeeInZoneInput, setDeliveryFeeInZoneInput] = useState('40')
  const [deliveryFeeOutOfZoneInput, setDeliveryFeeOutOfZoneInput] = useState('80')
  const [savingDeliveryFee, setSavingDeliveryFee] = useState(false)
  const [showZoneManager, setShowZoneManager] = useState(false)
  const [zoneImage, setZoneImage] = useState(null)
  const [zoneFile, setZoneFile] = useState(null)
  const [uploadingZone, setUploadingZone] = useState(false)
  const [zoneKmlFile, setZoneKmlFile] = useState(null)
  const [uploadingKml, setUploadingKml] = useState(false)
  const [zonePolygon, setZonePolygon] = useState(null)
  const [showRescueManager, setShowRescueManager] = useState(false)
  const [rescueStats, setRescueStats] = useState({ totalHolds: 0, activeHolds: 0, totalMatches: 0, totalRefunds: 0 })
  const [rescueLogs, setRescueLogs] = useState([])
  const [rescueLogsLoading, setRescueLogsLoading] = useState(false)
  const [rescueLoading, setRescueLoading] = useState(false)


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
      if (res.ok) { const d = await res.json(); setHeroImage(d.heroImage || null); setHeroDishName(d.heroDishName || 'Lechon Kawali'); setHeroDishPrice(String(d.heroDishPrice || 140)); setDeliveryFeeInZoneLocal(d.deliveryFeeInZone ?? 40); setDeliveryFeeOutOfZoneLocal(d.deliveryFeeOutOfZone ?? 80); setDeliveryFeeInZoneInput(String(d.deliveryFeeInZone ?? 40)); setDeliveryFeeOutOfZoneInput(String(d.deliveryFeeOutOfZone ?? 80)); setZoneImage(d.zoneImage || null); setZonePolygon(d.zonePolygon || null) }
    } catch {}
  }

  const clearAllMenu = async () => {
    if (!window.confirm('Delete ALL menu items? This cannot be undone.')) return
    setClearing(true)
    try {
      const res = await fetch(api('/api/menu/clear'), { method: 'DELETE', headers: adminHeaders() })
      if (res.ok) { setMenuItems([]); addActivity('All menu items cleared', 'info') }
    } catch {} finally { setClearing(false) }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await fetch(api('/api/admin/users'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setUsers(await res.json().then(d => d.users))
    } catch {} finally { setUsersLoading(false) }
  }

  const handleBanUser = async (id, newStatus) => {
    try {
      const res = await fetch(api(`/api/admin/users/${id}/status`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) { fetchUsers(); addActivity(`User ${newStatus}`, 'info') }
    } catch {}
  }

  const handleDeleteUser = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(api(`/api/admin/users/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { fetchUsers(); addActivity(`User "${name}" deleted`, 'info') }
    } catch {}
  }

  const fetchRiders = async () => {
    setRidersLoading(true)
    try {
      const res = await fetch(api('/api/admin/riders'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setRiders(await res.json().then(d => d.riders))
    } catch {} finally { setRidersLoading(false) }
  }

  const handleBanRider = async (id, status) => {
    try {
      const res = await fetch(api(`/api/admin/riders/${id}/status`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) fetchRiders()
    } catch {}
  }

  const handleDeleteRider = async (id, name) => {
    if (!confirm(`Delete rider "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(api(`/api/admin/riders/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { fetchRiders(); addActivity(`Rider "${name}" deleted`, 'info') }
    } catch {}
  }

  const fetchCashiers = async () => {
    setCashiersLoading(true)
    try {
      const res = await fetch(api('/api/cashier/manage'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setCashiers(await res.json().then(d => d.cashiers))
    } catch {} finally { setCashiersLoading(false) }
  }

  const handleAddCashier = async (e) => {
    e.preventDefault()
    if (!newCashier.name || !newCashier.username || !newCashier.password) return
    setAddingCashier(true)
    try {
      const res = await fetch(api('/api/cashier/register'), {
        method: 'POST', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newCashier),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) { setNewCashier({ name: '', username: '', password: '' }); fetchCashiers(); addActivity('Cashier added', 'info') }
    } catch {} finally { setAddingCashier(false) }
  }

  const fetchTestimonials = async () => {
    try {
      const res = await fetch(api('/api/config'))
      if (res.ok) { const d = await res.json(); setTestimonials(d.testimonials || []) }
    } catch {}
  }

  const handleSaveTestimonials = async () => {
    try {
      const res = await fetch(api('/api/config/testimonials'), {
        method: 'PATCH', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonials }),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) addActivity('Testimonials updated', 'info')
    } catch {}
  }

  const handleAddTestimonial = (e) => {
    e.preventDefault()
    if (!testimonialsForm.name || !testimonialsForm.text) return
    const updated = [...testimonials, { ...testimonialsForm }]
    setTestimonials(updated)
    setTestimonialsForm({ name: '', text: '', rating: 5 })
  }

  const handleClearTestimonials = () => {
    if (!window.confirm('Delete ALL testimonials? This cannot be undone.')) return
    setTestimonials([])
  }

  const handleDeleteTestimonial = (idx) => {
    if (!confirm(`Delete testimonial from "${testimonials[idx].name}"?`)) return
    const updated = testimonials.filter((_, i) => i !== idx)
    setTestimonials(updated)
  }

  const handleAddRider = async (e) => {
    e.preventDefault()
    if (!newRider.name || !newRider.phone || !newRider.password) return
    setAddingRider(true)
    try {
      const res = await fetch(api('/api/admin/riders'), {
        method: 'POST', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newRider),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) { setNewRider({ name: '', phone: '', password: '', email: '', vehicle_type: 'motorcycle', license_plate: '' }); fetchRiders(); addActivity('Rider created', 'info') }
    } catch {} finally { setAddingRider(false) }
  }

  const fetchRestaurants = async () => {
    setRestaurantsLoading(true)
    try {
      const res = await fetch(api('/api/admin/restaurants'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setRestaurants(await res.json().then(d => d.restaurants))
    } catch {} finally { setRestaurantsLoading(false) }
  }

  const handleAddRestaurant = async (e) => {
    e.preventDefault()
    if (!newRestaurant.name || !newRestaurant.username || !newRestaurant.password) return
    setAddingRestaurant(true)
    try {
      const res = await fetch(api('/api/admin/restaurants'), {
        method: 'POST', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newRestaurant),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) { setNewRestaurant({ name: '', username: '', password: '' }); fetchRestaurants(); addActivity('Restaurant account created', 'info') }
    } catch {} finally { setAddingRestaurant(false) }
  }

  const handleDeleteRestaurant = async (id, name) => {
    if (!confirm(`Delete restaurant "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(api(`/api/admin/restaurants/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { fetchRestaurants(); addActivity(`Restaurant "${name}" deleted`, 'info') }
    } catch {}
  }

  const handleDeleteCashier = async (id, name) => {
    if (!confirm(`Delete cashier "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch(api(`/api/cashier/manage/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { fetchCashiers(); addActivity(`Cashier "${name}" deleted`, 'info') }
    } catch {}
  }

  const fetchRescueStats = async () => {
    setRescueLoading(true)
    try {
      const res = await fetch(api('/api/rescue/stats'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setRescueStats(await res.json())
    } catch {} finally { setRescueLoading(false) }
  }

  const fetchRescueLogs = async () => {
    setRescueLogsLoading(true)
    try {
      const res = await fetch(api('/api/rescue/logs'), { headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { const data = await res.json(); setRescueLogs(data || []) }
    } catch {} finally { setRescueLogsLoading(false) }
  }

  useEffect(() => {
    if (loggedIn) { fetchOrders(); fetchMenu(); fetchAboutImages(); fetchHero() }
  }, [loggedIn])

  useOrderRealtime(useCallback((payload) => {
    if (payload._poll) { fetchOrders(); return }
    if (payload.eventType === 'INSERT') {
      setOrders(prev => [payload.new, ...prev])
      addActivity(`New order from ${payload.new.customer_name || 'someone'}`, 'success')
    } else if (payload.eventType === 'UPDATE') {
      setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o))
    } else if (payload.eventType === 'DELETE') {
      setOrders(prev => prev.filter(o => o.id !== payload.old.id))
    }
  }, [addActivity, fetchOrders]))

  useEffect(() => {
    if (!loggedIn) return

    const fetchAllRiders = async () => {
      try {
        const res = await fetch(api('/api/admin/riders'), { headers: adminHeaders() })
        if (res.ok) {
          const data = await res.json()
          setRiders(data.riders || [])
        }
      } catch {}
    }
    const fetchRiderStats = async () => {
      try {
        const res = await fetch(api('/api/rider/stats'), { headers: adminHeaders() })
        if (res.ok) setRiderStats(await res.json())
      } catch {}
    }

    let channel
    if (supabase) {
      channel = supabase
        .channel('riders-realtime')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'riders' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              setRiders(prev => prev.map(r => r.id === payload.new.id ? { ...r, ...payload.new } : r))
            } else if (payload.eventType === 'INSERT') {
              setRiders(prev => [payload.new, ...prev])
            } else if (payload.eventType === 'DELETE') {
              setRiders(prev => prev.filter(r => r.id !== payload.old.id))
            }
            fetchRiderStats()
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') console.log('[realtime] riders channel connected')
          else if (status === 'CHANNEL_ERROR') console.error('[realtime] riders channel error')
          else if (status === 'TIMED_OUT') console.warn('[realtime] riders channel timed out')
        })
    } else {
      console.warn('[realtime] supabase client not available â€” polling riders every 15s')
    }

    const pollTimer = setInterval(() => {
      fetchAllRiders()
      fetchRiderStats()
    }, 15000)

    return () => {
      if (channel) supabase.removeChannel(channel)
      clearInterval(pollTimer)
    }
  }, [loggedIn])

  useEffect(() => {
    if (!loggedIn) return
    const fetchRiderStats = async () => {
      try {
        const res = await fetch(api('/api/rider/stats'), { headers: adminHeaders() })
        if (res.ok) setRiderStats(await res.json())
      } catch {}
    }
    const fetchActiveUsers = (currentOrders) => {
      const today = new Date().toDateString()
      const unique = new Set(currentOrders.filter(o => {
        const d = o.created_at ? new Date(o.created_at).toDateString() : ''
        return d === today
      }).map(o => o.customer_name?.toLowerCase().trim()).filter(Boolean))
      setActiveUsers(unique.size)
    }
    fetchRiderStats()
    fetchActiveUsers(orders)
    const interval = setInterval(() => {
      fetchRiderStats()
      setOrders(currentOrders => {
        fetchActiveUsers(currentOrders)
        return currentOrders
      })
    }, 30000)
    return () => clearInterval(interval)
  }, [loggedIn, orders])

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />

  const changeStatus = async (id, newStatus) => {
    const prevOrder = orders.find(o => o.id === id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    if (prevOrder && prevOrder.status !== newStatus) {
      addActivity(`${prevOrder.customer_name} â†’ ${statusLabel[newStatus]}`, newStatus === 'pending' ? 'warning' : newStatus === 'in_delivery' ? 'success' : 'info')
    }
    try {
      const res = await fetch(api(`/api/orders/${id}`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) { setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prevOrder?.status } : o)); return }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: updated.status } : o))
    } catch {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: prevOrder?.status } : o))
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

  const handleUploadZone = async () => {
    if (!zoneFile) return
    setUploadingZone(true)
    try {
      const fd = new FormData(); fd.append('image', zoneFile)
      const res = await fetch(api('/api/config/zone'), { method: 'PUT', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError(d.error || 'Upload failed'); return }
      setZoneFile(null); setZoneImage(imageUrl(d.zoneImage))
    } catch (err) { setUploadError(err.message) } finally { setUploadingZone(false) }
  }

  const handleClearZone = async () => {
    if (!window.confirm('Remove the zone image?')) return
    try {
      const res = await fetch(api('/api/config/zone'), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) setZoneImage(null)
    } catch {}
  }

  const handleUploadKml = async () => {
    if (!zoneKmlFile) return
    setUploadingKml(true)
    try {
      const fd = new FormData(); fd.append('kml', zoneKmlFile)
      const res = await fetch(api('/api/config/zone/kml'), { method: 'PUT', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        const badLinkMsg = 'Could not find valid polygon coordinates in KML. Make sure your map has a drawn polygon and try exporting again.'
        setUploadError(d.error === badLinkMsg || d.error === 'Google blocked the KML fetch.'
          ? 'Google blocked the KML fetch. Please export your map directly: Open Google My Maps â†’ three dots on your layer â†’ "Export data" â†’ "KML/KMZ" â€” then upload the downloaded file.'
          : d.error || 'Upload failed')
        return
      }
      setZoneKmlFile(null); setZonePolygon(d.zonePolygon)
      addActivity(`Zone KML uploaded (${d.zonePolygon.length} points)`, 'info')
    } catch (err) { setUploadError(err.message) } finally { setUploadingKml(false) }
  }

  const handleClearKml = async () => {
    if (!window.confirm('Remove the zone KML?')) return
    try {
      const res = await fetch(api('/api/config/zone/kml'), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { setZonePolygon(null); addActivity('Zone KML cleared', 'info') }
    } catch {}
  }

  const handleClearHero = async () => {
    if (!window.confirm('Remove the hero image?')) return
    try {
      const res = await fetch(api('/api/config/hero'), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (res.ok) { setHeroImage(null); addActivity('Hero image removed', 'info') }
    } catch {}
  }

  const handleSaveHeroDish = async () => {
    try {
      const res = await fetch(api('/api/config/hero/dish'), {
        method: 'PATCH', headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: heroDishName, price: Number(heroDishPrice) }),
      })
      if (res.status === 401) { logout(); return }
      if (res.ok) addActivity('Hero dish updated', 'info')
    } catch {}
  }

  const handleSaveDeliveryFee = async () => {
    const inZone = Number(deliveryFeeInZoneInput)
    const outOfZone = Number(deliveryFeeOutOfZoneInput)
    if (isNaN(inZone) || inZone < 0 || isNaN(outOfZone) || outOfZone < 0) { setUploadError('Enter valid non-negative numbers'); return }
    setSavingDeliveryFee(true)
    try {
      const adminToken = localStorage.getItem('admin_token')
      await updateDeliveryFees({ inZone, outOfZone }, adminToken)
      setDeliveryFeeInZoneLocal(inZone)
      setDeliveryFeeOutOfZoneLocal(outOfZone)
      addActivity(`In-zone: P${inZone}, Out-of-zone: P${outOfZone}`, 'info')
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setSavingDeliveryFee(false)
    }
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

  // Micro-analytics
  const bottleneckCount = staleOrders.length
  const pendingCount = columnOrders('pending').length
  const ongoingCount = columnOrders('ongoing').length
  const inDeliveryCount = columnOrders('in_delivery').length

  return (
    <div className="min-h-screen bg-[#FFFBDA] text-[#4A3728]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* â”€â”€ Header â”€â”€ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-xl border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Admin <span className="bg-gradient-to-r from-[#D48040] to-[#4A3728] bg-clip-text text-transparent">Dashboard</span></h1>
              <p className="text-xs text-[#D48040]">{orders.length} orders - {menuItems.length} items</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setShowMenuManager(!showMenuManager)} className={`p-2 rounded-lg border transition-colors ${showMenuManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Menu"><Edit3 className="w-4 h-4" /></button>
            <button onClick={() => setShowHeroManager(!showHeroManager)} className={`p-2 rounded-lg border transition-colors ${showHeroManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Hero Image"><Camera className="w-4 h-4" /></button>
            <button onClick={() => setShowAboutManager(!showAboutManager)} className={`p-2 rounded-lg border transition-colors ${showAboutManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="About Images"><ImageIcon className="w-4 h-4" /></button>
            <button onClick={() => { setShowUsersManager(!showUsersManager); if (!showUsersManager && users.length === 0) fetchUsers() }} className={`p-2 rounded-lg border transition-colors ${showUsersManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Users"><Users className="w-4 h-4" /></button>
            <button onClick={() => { setShowRidersManager(!showRidersManager); if (!showRidersManager && riders.length === 0) fetchRiders() }} className={`p-2 rounded-lg border transition-colors ${showRidersManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Riders"><Bike className="w-4 h-4" /></button>
            <button onClick={() => { setShowCashiersManager(!showCashiersManager); if (!showCashiersManager && cashiers.length === 0) fetchCashiers() }} className={`p-2 rounded-lg border transition-colors ${showCashiersManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Cashiers"><User className="w-4 h-4" /></button>
            <button onClick={() => { setShowRestaurantsManager(!showRestaurantsManager); if (!showRestaurantsManager && restaurants.length === 0) fetchRestaurants() }} className={`p-2 rounded-lg border transition-colors ${showRestaurantsManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Restaurants"><ChefHat className="w-4 h-4" /></button>
            <button onClick={() => { setShowTestimonialsManager(!showTestimonialsManager); if (!showTestimonialsManager && testimonials.length === 0) fetchTestimonials() }} className={`p-2 rounded-lg border transition-colors ${showTestimonialsManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Manage Testimonials"><MessageSquare className="w-4 h-4" /></button>
            <button onClick={() => setShowDeliveryFeeManager(!showDeliveryFeeManager)} className={`p-2 rounded-lg border transition-colors ${showDeliveryFeeManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Delivery Fee"><DollarSign className="w-4 h-4" /></button>
            <button onClick={() => setShowZoneManager(!showZoneManager)} className={`p-2 rounded-lg border transition-colors ${showZoneManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Delivery Zone Map"><Map className="w-4 h-4" /></button>
            <button onClick={() => { setShowRescueManager(!showRescueManager); if (!showRescueManager) { fetchRescueStats(); fetchRescueLogs() } }} className={`p-2 rounded-lg border transition-colors ${showRescueManager ? 'bg-[#D48040]/10 border-[#D48040]/30 text-[#D48040]' : 'border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040]'}`} title="Rescue System"><Shield className="w-4 h-4" /></button>
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={logout} className="p-2 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>

        {/* â”€â”€ Micro-Analytics Cards â”€â”€ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
            <div className="flex items-center gap-2 text-[#4A3728] text-xs mb-1"><Users className="w-3.5 h-3.5 text-[#D48040]" />Active Users</div>
            <p className="text-2xl font-bold text-[#4A3728]">{activeUsers}</p>
          </div>
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
            <div className="flex items-center gap-2 text-[#4A3728] text-xs mb-1"><Bike className="w-3.5 h-3.5 text-emerald-400" />Riders</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{riderStats.online}</span>
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{riderStats.busy}</span>
              <span className="flex items-center gap-1 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-[#D48040]" />{riderStats.idle}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
            <div className="flex items-center gap-2 text-[#4A3728] text-xs mb-1"><TrendingUp className="w-3.5 h-3.5 text-blue-400" />Avg. Preparation</div>
            <p className="text-2xl font-bold text-[#4A3728]">{ongoingCount > 0 ? '~12 min' : 'â€”'}</p>
          </div>
          <div className={`rounded-xl border p-4 ${bottleneckCount > 0 ? 'border-red-500/30 bg-red-500/5' : 'border-[#FFEC9E] bg-[#FFFBDA]'}`}>
            <div className="flex items-center gap-2 text-[#4A3728] text-xs mb-1"><AlertTriangle className={`w-3.5 h-3.5 ${bottleneckCount > 0 ? 'text-red-400' : 'text-[#D48040]'}`} />Bottleneck</div>
            <p className={`text-2xl font-bold ${bottleneckCount > 0 ? 'text-red-400' : 'text-[#4A3728]'}`}>{bottleneckCount > 0 ? `${bottleneckCount} >${STALE_THRESHOLD_MIN}m` : 'None'}</p>
          </div>
        </div>

        {/* â”€â”€ Menu / About / Hero Manager (collapsible) â”€â”€ */}
        <AnimatePresence>
          {showMenuManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Edit3 className="w-4 h-4 text-[#D48040]" />Manage Menu Items</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={clearAllMenu} disabled={clearing} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all disabled:opacity-50"><Trash2 className="w-3 h-3" />{clearing ? 'Clearing...' : 'Clear All'}</button>
                    <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] text-xs font-semibold transition-all"><Plus className="w-3.5 h-3.5" />Add Item</button>
                  </div>
                </div>
                {showAddForm && (
                  <form onSubmit={handleAddItem} className="grid sm:grid-cols-5 gap-2 mb-3 p-3 rounded-xl bg-[#FFFBDA]">
                    <input type="text" placeholder="Name" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                    <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                    <select value={newItem.category} onChange={e => setNewItem(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50">
                      <option value="ulam">Ulam</option><option value="silog">Silog</option><option value="shake">Shake</option><option value="solo">Solo</option>
                    </select>
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{newImage ? newImage.name : 'Image'}</span><input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} className="hidden" /></label>
                    <button type="submit" disabled={adding || !newItem.name || !newItem.price} className="px-3 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
                  </form>
                )}
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {menuItems.map(item => (
                    <div key={item.id} className="rounded-xl bg-[#FFFBDA] p-2.5">
                      {editingId === item.id ? (
                        <div className="grid sm:grid-cols-6 gap-2">
                          <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="col-span-2 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" />
                          <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" />
                          <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50">
                            <option value="ulam">Ulam</option><option value="silog">Silog</option><option value="shake">Shake</option><option value="solo">Solo</option>
                          </select>
                          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-3.5 h-3.5 shrink-0" /><span className="truncate text-xs">{editImage ? editImage.name : 'Image'}</span><input type="file" accept="image/*" onChange={e => setEditImage(e.target.files[0])} className="hidden" /></label>
                          <div className="flex items-center gap-1"><button onClick={() => handleEdit(item.id)} className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-[#4A3728] transition-all"><Save className="w-3.5 h-3.5" /></button><button onClick={cancelEdit} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-all"><X className="w-3.5 h-3.5" /></button></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#FFFBDA] overflow-hidden shrink-0"><img src={imageUrl(item.image) || 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=80&q=60'} alt="" className="w-full h-full object-cover" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#4A3728] truncate">{item.name}</p><p className="text-xs text-[#D48040]">P{item.price} - {item.category}</p></div>
                          {(() => { const disabled = item.active === false; return (<button onClick={async () => { try { await fetch(api(`/api/menu/${item.id}`), { method: 'PATCH', headers: { ...adminHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: disabled }) }); fetchMenu() } catch {} }} className={['p-1.5 rounded-lg border transition-all', disabled ? 'bg-red-600/20 border-red-600/40 text-red-400' : 'border-[#FFEC9E] text-[#4A3728] hover:text-green-400 hover:border-emerald-400/30'].join(' ')} title={disabled ? 'Disabled' : 'Enabled'}><span className={['block w-3 h-3 rounded-full border-2 flex items-center justify-center', disabled ? 'border-red-400' : 'border-[#FFEC9E]'].join(' ')}><span className={['block w-1.5 h-1.5 rounded-full', disabled ? 'bg-red-400' : 'bg-transparent'].join(' ')} /></span></button>)})()}
                          <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-all" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
          {showHeroManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Camera className="w-4 h-4 text-[#D48040]" />Hero Image</h3>
                  {heroImage && (
                    <button onClick={handleClearHero} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"><Trash2 className="w-3 h-3" />Remove</button>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{heroFile ? heroFile.name : 'Choose image'}</span><input type="file" accept="image/*" onChange={e => { setHeroFile(e.target.files[0]); setUploadError('') }} className="hidden" /></label>
                  <button onClick={handleUploadHero} disabled={!heroFile || uploadingHero} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{uploadingHero ? 'Uploading...' : 'Upload'}</button>
                </div>
                {uploadError && <p className="text-red-400 text-xs mb-3">{uploadError}</p>}
                <div className="flex items-center gap-2 mb-3">
                  <input type="text" value={heroDishName} onChange={e => setHeroDishName(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="Dish name" />
                  <input type="number" value={heroDishPrice} onChange={e => setHeroDishPrice(e.target.value)} className="w-24 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="Price" />
                  <button onClick={handleSaveHeroDish} className="px-4 py-1.5 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all">Save</button>
                </div>
                {heroImage ? (
                  <div className="rounded-xl overflow-hidden border border-[#FFEC9E] bg-[#FFFBDA] max-w-md">
                    <img src={heroImage} alt="Hero" className="w-full aspect-video object-cover" />
                  </div>
                ) : (
                  <p className="text-sm text-[#D48040] text-center py-4">No hero image set.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showAboutManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><ImageIcon className="w-4 h-4 text-[#D48040]" />Manage About Images</h3>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{aboutFile ? aboutFile.name : 'Choose image'}</span><input type="file" accept="image/*" onChange={e => { setAboutFile(e.target.files[0]); setUploadError('') }} className="hidden" /></label>
                  <button onClick={handleUploadAbout} disabled={!aboutFile || uploadingAbout} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{uploadingAbout ? 'Uploading...' : 'Upload'}</button>
                </div>
                {uploadError && <p className="text-red-400 text-xs mb-3">{uploadError}</p>}
                {aboutImages.length === 0 ? <p className="text-sm text-[#D48040] text-center py-4">No images uploaded yet.</p> : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {aboutImages.map(item => (
                      <div key={item.id} className="group relative rounded-xl overflow-hidden border border-[#FFEC9E] bg-[#FFFBDA] aspect-square">
                        <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button onClick={() => handleDeleteAbout(item.id)} className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-[#4A3728] transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Users Manager â”€â”€ */}
        <AnimatePresence>
          {showUsersManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-[#D48040]" />Manage Users</h3>
                  <button onClick={fetchUsers} disabled={usersLoading} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D48040]" />
                  <input
                    type="text" placeholder="Search by name, email, phone, or ID..."
                    value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-[#FFFBDA] border border-[#FFEC9E] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#4A3728] placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50"
                  />
                </div>
                {users.length === 0 ? (
                  <p className="text-sm text-[#D48040] text-center py-4">{usersLoading ? 'Loading...' : 'No users found.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#4A3728]/60 text-xs border-b border-[#FFEC9E]">
                          <th className="text-left py-2 pr-2">User</th>
                          <th className="text-left py-2 pr-2">Contact</th>
                          <th className="text-left py-2 pr-2">ID</th>
                          <th className="text-left py-2 pr-2">Joined</th>
                          <th className="text-right py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(u => !userSearch || u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.phone?.includes(userSearch) || u.id?.toLowerCase().includes(userSearch.toLowerCase()))
                          .map(u => (
                          <tr key={u.id} className="border-b border-[#FFEC9E] hover:bg-[#FFEC9E]/30 transition-colors">
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                {u.avatar_url ? (
                                  <img src={imageUrl(u.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover border border-[#FFEC9E]" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#D48040]/20 border border-[#FFEC9E] flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-[#4A3728]" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[#4A3728] font-medium text-xs truncate max-w-[100px]">{u.name || 'â€”'}</p>
                                  <p className="text-[#4A3728]/60 text-[10px] capitalize">{u.auth_provider || 'â€”'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2 pr-2 text-[#4A3728] text-xs truncate max-w-[130px]">{u.email || u.phone || 'â€”'}</td>
                            <td className="py-2 pr-2">
                              <span className="text-[10px] font-mono text-[#D48040]">{u.id ? `${String(u.id).slice(0, 8)}...` : 'â€”'}</span>
                            </td>
                            <td className="py-2 pr-2 text-[#4A3728]/60 text-[10px]">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'â€”'}</td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handleBanUser(u.id, u.status === 'banned' ? 'active' : 'banned')} className={`p-1 rounded-lg border transition-all ${u.status === 'banned' ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10' : 'border-red-400/30 text-red-400 hover:bg-red-400/10'}`} title={u.status === 'banned' ? 'Unban' : 'Ban'}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleBanUser(u.id, u.status === 'disabled' ? 'active' : 'disabled')} className={`p-1 rounded-lg border transition-all ${u.status === 'disabled' ? 'border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10' : 'border-amber-400/30 text-amber-400 hover:bg-amber-400/10'}`} title={u.status === 'disabled' ? 'Enable' : 'Disable'}>
                                  <Zap className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDeleteUser(u.id, u.name)} className="p-1 rounded-lg border border-red-400/30 text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
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

        {/* â”€â”€ Riders Manager â”€â”€ */}
        <AnimatePresence>
          {showRidersManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Bike className="w-4 h-4 text-[#D48040]" />Manage Delivery Drivers</h3>
                  <button onClick={fetchRiders} disabled={ridersLoading} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${ridersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <form onSubmit={handleAddRider} className="grid sm:grid-cols-6 gap-2 mb-3 p-3 rounded-xl bg-[#FFFBDA]">
                  <input type="text" placeholder="Full name" value={newRider.name} onChange={e => setNewRider(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <input type="tel" placeholder="Phone" value={newRider.phone} onChange={e => setNewRider(f => ({ ...f, phone: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <input type="email" placeholder="Email (optional)" value={newRider.email} onChange={e => setNewRider(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <div className="relative">
                    <input type={showRiderPassword ? 'text' : 'password'} placeholder="Password" value={newRider.password} onChange={e => setNewRider(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 pr-9" />
                    <button type="button" onClick={() => setShowRiderPassword(!showRiderPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D48040] hover:text-[#4A3728] transition-colors">
                      {showRiderPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <select value={newRider.vehicle_type} onChange={e => setNewRider(f => ({ ...f, vehicle_type: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50">
                    <option value="bicycle">Bicycle</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="car">Car</option>
                  </select>
                  <button type="submit" disabled={addingRider || !newRider.name || !newRider.phone || !newRider.password} className="px-3 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{addingRider ? 'Adding...' : 'Add Rider'}</button>
                </form>

                {riders.length === 0 ? (
                  <p className="text-sm text-[#D48040] text-center py-4">{ridersLoading ? 'Loading...' : 'No riders found.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#4A3728]/60 text-xs border-b border-[#FFEC9E]">
                          <th className="text-left py-2 pr-2">Rider</th>
                          <th className="text-left py-2 pr-2">ID</th>
                          <th className="text-left py-2 pr-2">Phone</th>
                          <th className="text-left py-2 pr-2">Vehicle</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Deliveries</th>
                          <th className="text-right py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riders.map(r => (
                          <tr key={r.id} className="border-b border-[#FFEC9E] hover:bg-[#FFEC9E]/30 transition-colors">
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                {r.avatar_url ? (
                                  <img src={imageUrl(r.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover border border-[#FFEC9E]" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#D48040]/20 border border-[#FFEC9E] flex items-center justify-center">
                                    <Bike className="w-3.5 h-3.5 text-[#4A3728]" />
                                  </div>
                                )}
                                <span className="text-[#4A3728] font-medium text-xs truncate max-w-[100px]">{r.name || 'â€”'}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-2"><span className="text-[10px] font-mono text-[#D48040]">{r.id ? `${String(r.id).slice(0, 8)}...` : 'â€”'}</span></td>
                            <td className="py-2 pr-2 text-[#4A3728] truncate max-w-[130px]">{r.phone || 'â€”'}</td>
                            <td className="py-2 pr-2 text-[#4A3728] capitalize">{r.vehicle_type || 'â€”'}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                                ${r.status === 'banned' ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                : r.status === 'disabled' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : r.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : r.status === 'busy' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-[#4A3728]/10 text-[#4A3728]/60 border border-[#4A3728]/30]'}`}>
                                <span className={`w-1 h-1 rounded-full
                                  ${r.status === 'banned' ? 'bg-red-400'
                                  : r.status === 'disabled' ? 'bg-amber-400'
                                  : r.status === 'online' ? 'bg-emerald-400'
                                  : r.status === 'busy' ? 'bg-blue-400'
                                  : 'bg-[#D48040]'}`} />
                                {r.status || 'offline'}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-[#4A3728]/60 text-xs">{r.total_deliveries || 0}</td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {(!r.status || r.status === 'online' || r.status === 'idle' || r.status === 'offline' || r.status === 'busy') ? (
                                  <button onClick={() => handleBanRider(r.id, 'disabled')} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-amber-400 hover:border-amber-400/30 transition-all" title="Disable">
                                    <Zap className="w-3.5 h-3.5" />
                                  </button>
                                ) : r.status === 'disabled' ? (
                                  <button onClick={() => handleBanRider(r.id, 'online')} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-emerald-400 hover:border-emerald-400/30 transition-all" title="Enable">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                ) : null}
                                {r.status !== 'banned' ? (
                                  <button onClick={() => handleBanRider(r.id, 'banned')} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Ban">
                                    <XCircle className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button onClick={() => handleBanRider(r.id, 'online')} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-emerald-400 hover:border-emerald-400/30 transition-all" title="Unban">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button onClick={() => handleDeleteRider(r.id, r.name)} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete">
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

        {/* â”€â”€ Cashiers Manager â”€â”€ */}
        <AnimatePresence>
          {showCashiersManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><User className="w-4 h-4 text-[#D48040]" />Manage Cashiers</h3>
                  <button onClick={fetchCashiers} disabled={cashiersLoading} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${cashiersLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <form onSubmit={handleAddCashier} className="grid sm:grid-cols-4 gap-2 mb-3 p-3 rounded-xl bg-[#FFFBDA]">
                  <input type="text" placeholder="Full name" value={newCashier.name} onChange={e => setNewCashier(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <input type="text" placeholder="Username" value={newCashier.username} onChange={e => setNewCashier(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <div className="relative">
                    <input type={showCashierPassword ? 'text' : 'password'} placeholder="Password" value={newCashier.password} onChange={e => setNewCashier(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 pr-9" />
                    <button type="button" onClick={() => setShowCashierPassword(!showCashierPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D48040] hover:text-[#4A3728] transition-colors">
                      {showCashierPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={addingCashier || !newCashier.name || !newCashier.username || !newCashier.password} className="px-3 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{addingCashier ? 'Adding...' : 'Add Cashier'}</button>
                </form>

                {cashiers.length === 0 ? (
                  <p className="text-sm text-[#D48040] text-center py-4">{cashiersLoading ? 'Loading...' : 'No cashiers yet.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#4A3728]/60 text-xs border-b border-[#FFEC9E]">
                          <th className="text-left py-2 pr-2">Cashier</th>
                          <th className="text-left py-2 pr-2">ID</th>
                          <th className="text-left py-2 pr-2">Username</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Created</th>
                          <th className="text-right py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashiers.map(c => (
                          <tr key={c.id} className="border-b border-[#FFEC9E] hover:bg-[#FFEC9E]/30 transition-colors">
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2">
                                {c.avatar_url ? (
                                  <img src={imageUrl(c.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover border border-[#FFEC9E]" />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-[#D48040]/20 border border-[#FFEC9E] flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-[#4A3728]" />
                                  </div>
                                )}
                                <span className="text-[#4A3728] font-medium text-xs truncate max-w-[100px]">{c.name}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-2"><span className="text-[10px] font-mono text-[#D48040]">{c.id ? `${String(c.id).slice(0, 8)}...` : 'â€”'}</span></td>
                            <td className="py-2 pr-2 text-[#4A3728]">{c.username}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                <span className={`w-1 h-1 rounded-full ${c.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {c.status || 'active'}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-[#4A3728]/60 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'â€”'}</td>
                            <td className="py-2 text-right">
                              <button onClick={() => handleDeleteCashier(c.id, c.name)} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* â”€â”€ Restaurants Manager â”€â”€ */}
        <AnimatePresence>
          {showRestaurantsManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><ChefHat className="w-4 h-4 text-[#D48040]" />Manage Restaurants</h3>
                  <button onClick={fetchRestaurants} disabled={restaurantsLoading} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
                    <RefreshCw className={`w-3.5 h-3.5 ${restaurantsLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <form onSubmit={handleAddRestaurant} className="grid sm:grid-cols-4 gap-2 mb-3 p-3 rounded-xl bg-[#FFFBDA]">
                  <input type="text" placeholder="Restaurant name" value={newRestaurant.name} onChange={e => setNewRestaurant(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <input type="text" placeholder="Username" value={newRestaurant.username} onChange={e => setNewRestaurant(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <div className="relative">
                    <input type={showRestaurantPassword ? 'text' : 'password'} placeholder="Password" value={newRestaurant.password} onChange={e => setNewRestaurant(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 pr-9" />
                    <button type="button" onClick={() => setShowRestaurantPassword(!showRestaurantPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D48040] hover:text-[#4A3728] transition-colors">
                      {showRestaurantPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={addingRestaurant || !newRestaurant.name || !newRestaurant.username || !newRestaurant.password} className="px-3 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{addingRestaurant ? 'Adding...' : 'Add Restaurant'}</button>
                </form>

                {restaurants.length === 0 ? (
                  <p className="text-sm text-[#D48040] text-center py-4">{restaurantsLoading ? 'Loading...' : 'No restaurants yet.'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[#4A3728]/60 text-xs border-b border-[#FFEC9E]">
                          <th className="text-left py-2 pr-2">Name</th>
                          <th className="text-left py-2 pr-2">Username</th>
                          <th className="text-left py-2 pr-2">Status</th>
                          <th className="text-left py-2 pr-2">Created</th>
                          <th className="text-right py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurants.map(r => (
                          <tr key={r.id} className="border-b border-[#FFEC9E] hover:bg-[#FFEC9E]/30 transition-colors">
                            <td className="py-2 pr-2 text-[#4A3728] font-medium truncate max-w-[120px]">{r.name}</td>
                            <td className="py-2 pr-2 text-[#4A3728]">{r.username}</td>
                            <td className="py-2 pr-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                <span className={`w-1 h-1 rounded-full ${r.status === 'active' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {r.status || 'active'}
                              </span>
                            </td>
                            <td className="py-2 pr-2 text-[#4A3728]/60 text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'â€”'}</td>
                            <td className="py-2 text-right">
                              <button onClick={() => handleDeleteRestaurant(r.id, r.name)} className="p-1 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* â”€â”€ Testimonials Manager â”€â”€ */}
        <AnimatePresence>
          {showTestimonialsManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><MessageSquare className="w-4 h-4 text-[#D48040]" />Manage Testimonials</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleClearTestimonials} disabled={testimonials.length === 0} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all disabled:opacity-50"><Trash2 className="w-3 h-3" />Clear All</button>
                    <button onClick={() => { handleSaveTestimonials(); addActivity('Testimonials saved', 'info') }} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] text-xs font-semibold transition-all"><Save className="w-3.5 h-3.5" />Save</button>
                  </div>
                </div>

                <form onSubmit={handleAddTestimonial} className="grid sm:grid-cols-4 gap-2 mb-3 p-3 rounded-xl bg-[#FFFBDA]">
                  <input type="text" placeholder="Name" value={testimonialsForm.name} onChange={e => setTestimonialsForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <input type="text" placeholder="Testimonial text" value={testimonialsForm.text} onChange={e => setTestimonialsForm(f => ({ ...f, text: e.target.value }))} className="col-span-2 w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50" />
                  <div className="flex items-center gap-2">
                    <select value={testimonialsForm.rating} onChange={e => setTestimonialsForm(f => ({ ...f, rating: Number(e.target.value) }))} className="flex-1 px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50">
                      {[1,2,3,4,5].map(r => <option key={r} value={r}>{r} Star{r > 1 ? 's' : ''}</option>)}
                    </select>
                    <button type="submit" disabled={!testimonialsForm.name || !testimonialsForm.text} className="px-3 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50"><Plus className="w-3.5 h-3.5" /></button>
                  </div>
                </form>

                {testimonials.length === 0 ? (
                  <p className="text-sm text-[#D48040] text-center py-4">No testimonials yet. Add one above.</p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {testimonials.map((t, idx) => (
                      <div key={idx} className="rounded-xl bg-[#FFFBDA] p-2.5">
                        {editingTestimonialIdx === idx ? (
                          <div className="grid sm:grid-cols-5 gap-2">
                            <input type="text" value={testimonialsForm.name} onChange={e => setTestimonialsForm(f => ({ ...f, name: e.target.value }))} className="col-span-2 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" />
                            <input type="text" value={testimonialsForm.text} onChange={e => setTestimonialsForm(f => ({ ...f, text: e.target.value }))} className="col-span-2 px-3 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" />
                            <div className="flex items-center gap-1">
                              <select value={testimonialsForm.rating} onChange={e => setTestimonialsForm(f => ({ ...f, rating: Number(e.target.value) }))} className="flex-1 px-2 py-1.5 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50">
                                {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                              <button onClick={() => { const updated = [...testimonials]; updated[idx] = { ...testimonialsForm }; setTestimonials(updated); setEditingTestimonialIdx(null) }} className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-[#4A3728] transition-all"><Save className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingTestimonialIdx(null)} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-all"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center gap-0.5 shrink-0">
                              {Array.from({ length: 5 }).map((_, j) => (
                                <Star key={j} className={`w-3 h-3 ${j < t.rating ? 'fill-[#D48040] text-[#D48040]' : 'text-[#D48040]'}`} />
                              ))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#4A3728] truncate">{t.name}</p>
                              <p className="text-xs text-[#D48040] truncate">{t.text}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setEditingTestimonialIdx(idx); setTestimonialsForm({ name: t.name, text: t.text, rating: t.rating }) }} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-all" title="Edit"><Upload className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteTestimonial(idx)} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Delivery Fee Manager â”€â”€ */}
        <AnimatePresence>
          {showDeliveryFeeManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><DollarSign className="w-4 h-4 text-emerald-400" />Delivery Fees</h3>
                  <span className="text-xs text-[#D48040]">In: P{deliveryFeeInZone} - Out: P{deliveryFeeOutOfZone}</span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1">
                    <label className="text-xs text-[#D48040] mb-1 block">In Zone</label>
                    <input type="number" min="0" value={deliveryFeeInZoneInput} onChange={e => setDeliveryFeeInZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="In zone fee" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-[#D48040] mb-1 block">Out of Zone</label>
                    <input type="number" min="0" value={deliveryFeeOutOfZoneInput} onChange={e => setDeliveryFeeOutOfZoneInput(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70]/50" placeholder="Out of zone fee" />
                  </div>
                  <button onClick={handleSaveDeliveryFee} disabled={savingDeliveryFee} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50 self-end">{savingDeliveryFee ? 'Saving...' : 'Update'}</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Zone Image Manager â”€â”€ */}
        <AnimatePresence>
          {showZoneManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Map className="w-4 h-4 text-emerald-400" />Delivery Zone Map</h3>
                  {zoneImage && (
                    <button onClick={handleClearZone} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"><Trash2 className="w-3 h-3" />Remove</button>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{zoneFile ? zoneFile.name : 'Choose image'}</span><input type="file" accept="image/*" onChange={e => { setZoneFile(e.target.files[0]); setUploadError('') }} className="hidden" /></label>
                  <button onClick={handleUploadZone} disabled={!zoneFile || uploadingZone} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{uploadingZone ? 'Uploading...' : 'Upload'}</button>
                </div>
                {uploadError && <p className="text-red-400 text-xs mb-3">{uploadError}</p>}
                {zoneImage ? (
                  <div className="rounded-xl overflow-hidden border border-[#FFEC9E] bg-[#FFFBDA] max-w-md">
                    <img src={zoneImage} alt="Delivery Zone" className="w-full aspect-video object-cover" />
                  </div>
                ) : (
                  <p className="text-sm text-[#D48040] text-center py-4">No zone map image set. Upload an image showing the delivery area.</p>
                )}

                <hr className="border-[#FFEC9E]" />

                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#4A3728] flex items-center gap-2"><Map className="w-4 h-4 text-[#D48040]" />KML Zone Polygon</h4>
                  {zonePolygon && (
                    <button onClick={handleClearKml} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-all"><Trash2 className="w-3 h-3" />Clear</button>
                  )}
                </div>
                <p className="text-xs text-[#D48040]">Upload a KML exported from Google My Maps. The polygon will auto-detect if a user's location is in the delivery zone.</p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm cursor-pointer hover:border-[#FFBB70]/50 transition-colors"><Upload className="w-4 h-4 shrink-0" /><span className="truncate">{zoneKmlFile ? zoneKmlFile.name : 'Choose KML'}</span><input type="file" accept=".kml,application/vnd.google-earth.kml+xml,text/xml" onChange={e => { setZoneKmlFile(e.target.files[0]); setUploadError('') }} className="hidden" /></label>
                  <button onClick={handleUploadKml} disabled={!zoneKmlFile || uploadingKml} className="px-4 py-2 rounded-lg bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50">{uploadingKml ? 'Uploading...' : 'Upload'}</button>
                  {zonePolygon && <span className="text-xs text-emerald-400">{zonePolygon.length} polygon points loaded</span>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Rescue Manager â”€â”€ */}
        <AnimatePresence>
          {showRescueManager && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
              <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#4A3728] flex items-center gap-2 text-sm"><Shield className="w-4 h-4 text-[#D48040]" />Rescue System</h3>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => { fetchRescueStats(); fetchRescueLogs() }} disabled={rescueLoading} className="p-1.5 rounded-lg border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors disabled:opacity-50">
                      <RefreshCw className={`w-3.5 h-3.5 ${rescueLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-[#D48040] mb-1">Total Holds</p>
                    <p className="text-xl font-bold text-[#4A3728]">{rescueStats.totalHolds}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-amber-400 mb-1">Active Holds</p>
                    <p className="text-xl font-bold text-[#4A3728]">{rescueStats.activeHolds}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-emerald-400 mb-1">Matches</p>
                    <p className="text-xl font-bold text-[#4A3728]">{rescueStats.totalMatches}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-[#FFFBDA] p-3">
                    <p className="text-[10px] text-blue-400 mb-1">Refunds</p>
                    <p className="text-xl font-bold text-[#4A3728]">{rescueStats.totalRefunds}</p>
                  </div>
                </div>

                {/* Notification (placeholder) */}
                <div className="rounded-xl border border-[#FFEC9E] bg-[#FFFBDA] p-3">
                  <h4 className="text-sm font-semibold text-[#4A3728] flex items-center gap-2"><Bell className="w-4 h-4 text-[#D48040]" />Notifications</h4>
                  <p className="text-xs text-[#D48040] mt-1">Push notification system (FCM) coming in Phase 9.</p>
                </div>

                {/* Rescue Logs */}
                <div>
                  <h4 className="text-sm font-semibold text-[#4A3728] flex items-center gap-2 mb-2"><ListChecks className="w-4 h-4 text-[#D48040]" />Rescue Logs</h4>
                  {rescueLogsLoading ? (
                    <div className="text-center py-4"><div className="w-5 h-5 border-2 border-[#D48040] border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  ) : rescueLogs.length === 0 ? (
                    <p className="text-sm text-[#D48040] text-center py-4">No rescue activity yet.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[#D48040] border-b border-[#FFEC9E]">
                            <th className="text-left py-1.5 pr-2">Time</th>
                            <th className="text-left py-1.5 pr-2">Action</th>
                            <th className="text-left py-1.5 pr-2">Details</th>
                            <th className="text-right py-1.5">Order ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rescueLogs.map((log, idx) => {
                            const detailText = typeof log.details === 'object' && log.details ? JSON.stringify(log.details) : log.details || 'â€”'
                            const orderId = log.details?.order_id || null
                            return (
                            <tr key={idx} className="border-b border-[#FFEC9E] hover:bg-[#FFEC9E]/30 transition-colors">
                              <td className="py-1.5 pr-2 text-[#D48040] whitespace-nowrap">{log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'â€”'}</td>
                              <td className="py-1.5 pr-2 text-[#4A3728] capitalize">{log.action?.replace(/_/g, ' ')}</td>
                              <td className="py-1.5 pr-2 text-[#D48040] truncate max-w-[200px]">{detailText}</td>
                              <td className="py-1.5 text-right text-[#D48040]">{orderId ? `#${String(orderId).slice(-6)}` : 'â€”'}</td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* â”€â”€ Main Board + Activity Feed â”€â”€ */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Kanban */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 min-h-[60vh]">
            {COLUMNS.map(col => {
              const items = columnOrders(col.key)
              const isOver = dragId && items.every(o => o.id !== dragId)
              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.key)}
                  className={`rounded-2xl border ${col.border} ${col.bg} p-3 flex flex-col gap-2 transition-all ${isOver ? 'ring-2 ring-[#D48040]/50' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <col.icon className={`w-4 h-4 ${col.text}`} />
                      <span className="text-sm font-semibold text-[#4A3728]">{col.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text} font-medium`}>{items.length}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto min-h-[200px]">
                    {items.length === 0 && <p className="text-xs text-[#D48040] text-center py-8">No orders</p>}
                    {items.map(order => <OrderCard key={order.id} order={order} colKey={col.key} onChangeStatus={changeStatus} onDeleteOrder={handleDeleteOrder} onDragStart={setDragId} />)}
                  </div>
                  {col.key === 'pending' && items.length > 0 && (
                    <button onClick={() => items.forEach(o => { if ((o.status || 'pending') === 'pending') changeStatus(o.id, 'ongoing') })} className="text-xs text-[#D48040] hover:text-[#4A3728] transition-colors py-1 text-center border-t border-[#D48040] mt-1">
                      Move all to Ongoing
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Activity Feed */}
          <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4A3728] mb-3"><Clock className="w-4 h-4 text-[#D48040]" />Activity</div>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs" ref={feedEndRef}>
              {activityFeed.length === 0 && <p className="text-[#D48040] text-center py-6">No activity yet</p>}
              {activityFeed.map(entry => (
                <div key={entry.id} className="flex items-start gap-2 pb-2 border-b border-[#FFEC9E] last:border-0">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${entry.type === 'success' ? 'bg-emerald-400' : entry.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  <div>
                    <p className="text-[#4A3728]">{entry.msg}</p>
                    <p className="text-[#4A3728]/60 text-[10px] mt-0.5">{formatTime(entry.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* â”€â”€ Order History â”€â”€ */}
        {orders.some(o => ['done', 'canceled'].includes(o.status)) && (
          <details className="mt-6 rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA]">
            <summary className="px-4 py-3 text-sm text-[#4A3728] cursor-pointer hover:text-[#4A3728] transition-colors flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-[#D48040]" />
              Order History ({orders.filter(o => ['done', 'canceled'].includes(o.status)).length})
            </summary>
            <div className="px-4 pb-3 space-y-1.5 max-h-64 overflow-y-auto">
              {orders.filter(o => ['done', 'canceled'].includes(o.status)).map(order => (
                <div key={order.id} className="flex items-center justify-between text-xs text-[#D48040] py-1.5 border-b border-[#FFEC9E] last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-[#D48040] shrink-0">#{String(order.id).slice(-4)}</span>
                    <span className="truncate">{order.customer_name || order.customer_contact}</span>
                    {order.total !== undefined && <span className="text-[10px] text-[#D48040] shrink-0">â‚±{Number(order.total).toLocaleString()}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px]">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${order.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* â”€â”€ Loading / Error / Empty â”€â”€ */}
        {loading && orders.length === 0 && (
          <div className="text-center py-16">
            <div className="w-6 h-6 border-2 border-[#D48040] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#4A3728] text-sm">Loading orders...</p>
          </div>
        )}

        {error && <div className="text-center py-12"><p className="text-red-400 text-sm">{error}</p></div>}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-[#D48040] mx-auto mb-3" />
            <p className="text-[#4A3728] font-medium">No orders yet</p>
            <p className="text-xs text-[#D48040] mt-1">Orders will appear here once customers place them.</p>
          </div>
        )}
      </div>
    </div>
  )
}


