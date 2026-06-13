import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Clock, Bike, CheckCircle, XCircle, Search, ArrowLeft, Loader2, MapPin, Phone, User } from 'lucide-react'
import { api } from '../api'

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

function OrderCard({ order }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon
  const idx = statusIndex(order.status)
  const totalItems = order.items?.reduce((s, i) => s + i.quantity, 0) || 0

  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </div>
        <span className="text-xs text-[#71717a]">{timeAgo(order.created_at)}</span>
      </div>

      {/* Progress bar for non-canceled orders */}
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

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <User className="w-3.5 h-3.5" />
          <span className="text-white">{order.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <Phone className="w-3.5 h-3.5" />
          <span>{order.customer_contact}</span>
        </div>
        <div className="flex items-center gap-2 text-[#a1a1aa]">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">{order.address}</span>
        </div>
      </div>

      <div className="text-xs text-[#71717a]">
        {totalItems} item{totalItems !== 1 ? 's' : ''} &middot; ₱{order.total}
      </div>

      {order.items && (
        <details className="text-xs text-[#71717a]">
          <summary className="cursor-pointer hover:text-[#a1a1aa]">View items</summary>
          <ul className="mt-1.5 space-y-1 pl-2">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between">
                <span>{item.quantity}x {item.name}</span>
                <span>₱{(item.price + (item.addons || []).reduce((s, a) => s + a.price, 0)) * item.quantity}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

export default function OrderTracking() {
  const [contact, setContact] = useState('')
  const [orders, setOrders] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    const clean = contact.replace(/\D/g, '')
    if (clean.length < 10) {
      setError('Please enter a valid phone number')
      return
    }
    setError('')
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(api(`/api/orders/track/${clean}`))
      const data = await res.json()
      setOrders(data)
      if (!data || data.length === 0) setError('No orders found for this number')
    } catch {
      setError('Failed to look up orders')
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <a
          href="#"
          className="p-2 text-[#a1a1aa] hover:text-white transition-colors rounded-lg hover:bg-[#18181b]"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <h1 className="text-lg font-semibold">Track Your Order</h1>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="tel"
            placeholder="Enter your phone number (09XXXXXXXXX)"
            value={contact}
            onChange={e => { setContact(e.target.value); setError('') }}
            className="w-full px-4 py-3 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors pr-12"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#f97316] hover:text-[#ea580c] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[#71717a] text-xs mt-1.5">
          Enter the mobile number you used when placing the order
        </p>
      </form>

      {error && searched && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-[#27272a] mx-auto mb-3" />
          <p className="text-[#a1a1aa] text-sm">{error}</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-[#71717a]">{orders.length} order{orders.length !== 1 ? 's' : ''} found</p>
          {orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
