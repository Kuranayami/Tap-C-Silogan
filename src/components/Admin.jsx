import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Clock, User, Phone, MapPin, ArrowLeft, RefreshCw, Check, ChevronDown, ChevronUp, Plus, LogOut, Edit3, Trash2, X, Save, Upload, ImageIcon, Camera } from 'lucide-react'
import AdminLogin from './AdminLogin'
import { api, imageUrl } from '../api'

const adminHeaders = () => {
  const token = localStorage.getItem('admin_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('admin_token'))
  const [orders, setOrders] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [doneOpen, setDoneOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showMenuManager, setShowMenuManager] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'ulam' })
  const [newImage, setNewImage] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', price: '', category: 'ulam' })
  const [editImage, setEditImage] = useState(null)
  const [showAboutManager, setShowAboutManager] = useState(false)
  const [aboutImages, setAboutImages] = useState([])
  const [uploadingAbout, setUploadingAbout] = useState(false)
  const [aboutFile, setAboutFile] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [heroImage, setHeroImage] = useState(null)
  const [heroFile, setHeroFile] = useState(null)
  const [uploadingHero, setUploadingHero] = useState(false)

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

  const handleUploadAbout = async () => {
    if (!aboutFile) return
    setUploadError('')
    setUploadingAbout(true)
    try {
      const fd = new FormData()
      fd.append('image', aboutFile)
      const res = await fetch(api('/api/about'), { method: 'POST', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return }
      setAboutFile(null)
      fetchAboutImages()
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingAbout(false)
    }
  }

  const handleDeleteAbout = async (id) => {
    if (!confirm('Delete this image?')) return
    try {
      const res = await fetch(api(`/api/about/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Delete failed')
      fetchAboutImages()
    } catch (err) {
      console.error(err)
    }
  }

  const fetchHero = async () => {
    try {
      const res = await fetch(api('/api/config'))
      if (res.ok) { const d = await res.json(); setHeroImage(d.heroImage || null) }
    } catch {}
  }

  const handleUploadHero = async () => {
    if (!heroFile) return
    setUploadingHero(true)
    try {
      const fd = new FormData()
      fd.append('image', heroFile)
      const res = await fetch(api('/api/config/hero'), { method: 'PUT', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setUploadError(d.error || 'Upload failed'); return }
      setHeroFile(null)
      setHeroImage(imageUrl(d.heroImage))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploadingHero(false)
    }
  }

  useEffect(() => {
    if (loggedIn) { fetchOrders(); fetchMenu(); fetchAboutImages(); fetchHero() }
  }, [loggedIn])

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />

  const handleDeleteOrder = async (id) => {
    if (!confirm('Delete this order permanently?')) return
    try {
      const res = await fetch(api(`/api/orders/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to delete')
      setOrders(prev => prev.filter(o => o.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const markDone = async (id) => {
    try {
      const res = await fetch(api(`/api/orders/${id}`), {
        method: 'PATCH',
        headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to update')
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'done' } : o))
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItem.name || !newItem.price || !newItem.category) return
    setAdding(true)
    try {
      const fd = new FormData()
      fd.append('name', newItem.name)
      fd.append('price', newItem.price)
      fd.append('category', newItem.category)
      if (newImage) fd.append('image', newImage)

      const res = await fetch(api('/api/menu'), { method: 'POST', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to add')
      setNewItem({ name: '', price: '', category: 'ulam' })
      setNewImage(null)
      setShowAddForm(false)
      fetchMenu()
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditForm({ name: item.name, price: String(item.price), category: item.category })
    setEditImage(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', price: '', category: 'ulam' })
    setEditImage(null)
  }

  const handleEdit = async (id) => {
    if (!editForm.name || !editForm.price || !editForm.category) return
    try {
      const fd = new FormData()
      fd.append('name', editForm.name)
      fd.append('price', editForm.price)
      fd.append('category', editForm.category)
      if (editImage) fd.append('image', editImage)

      const res = await fetch(api(`/api/menu/${id}`), { method: 'PATCH', headers: adminHeaders(), body: fd })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to update')
      cancelEdit()
      fetchMenu()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this item?')) return
    try {
      const res = await fetch(api(`/api/menu/${id}`), { method: 'DELETE', headers: adminHeaders() })
      if (res.status === 401) { logout(); return }
      if (!res.ok) throw new Error('Failed to delete')
      fetchMenu()
    } catch (err) {
      console.error(err)
    }
  }

  const pending = orders.filter(o => o.status !== 'done')
  const done = orders.filter(o => o.status === 'done')

  const goBack = () => { window.location.hash = '' }

  const OrderCard = ({ order, index, showDone }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-[#27272a] bg-[#18181b] p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-[#f97316]" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Order #{order.id.slice(-6)}</h3>
              <div className="flex items-center gap-2 text-xs text-[#71717a] mt-0.5">
                <Clock className="w-3 h-3" />
                {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-[#a1a1aa]">
              <User className="w-4 h-4 text-[#f97316] shrink-0" />
              {order.customer_name}
            </div>
            <div className="flex items-center gap-2 text-[#a1a1aa]">
              <Phone className="w-4 h-4 text-[#f97316] shrink-0" />
              {order.customer_contact}
            </div>
            <div className="flex items-start gap-2 text-[#a1a1aa] sm:col-span-2">
              <MapPin className="w-4 h-4 text-[#f97316] shrink-0 mt-0.5" />
              <a
                href={order.maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#f97316] transition-colors underline underline-offset-2 decoration-[#27272a] hover:decoration-[#f97316]"
              >
                {order.address}
              </a>
            </div>
          </div>
          <div className="border-t border-[#27272a] pt-3 space-y-1.5">
            {order.items.map((item, j) => (
              <div key={j} className="flex justify-between text-sm">
                <span className="text-[#a1a1aa]">
                  {item.quantity}x {item.name}
                  {item.addons?.length > 0 && (
                    <span className="text-[#71717a] text-xs ml-1">
                      (+{item.addons.map(a => a.name + (a.quantity > 1 ? ` ×${a.quantity}` : '')).join(', ')})
                    </span>
                  )}
                </span>
                <span className="text-white font-medium">
                  ₱{(item.price + (item.addons || []).reduce((s, a) => s + a.price, 0)) * item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
          {showDone ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">Done</span>
              <button onClick={() => handleDeleteOrder(order.id)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 hover:border-red-400/30 transition-all" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => markDone(order.id)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-semibold transition-all active:scale-95">
              <Check className="w-3.5 h-3.5" />
              Mark as Done
            </button>
          )}
          <div className="text-right">
            {order.delivery_fee > 0 && <p className="text-xs text-[#71717a]">+₱{order.delivery_fee} delivery</p>}
            <span className="text-lg font-bold text-[#f97316] whitespace-nowrap">₱{order.total}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={goBack} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Admin{' '}
                <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">Dashboard</span>
              </h1>
              <p className="text-sm text-[#a1a1aa] mt-1">
                {pending.length} pending &middot; {done.length} done &middot; {menuItems.length} menu items &middot; {aboutImages.length} images
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowMenuManager(!showMenuManager); setShowAddForm(false); setShowAboutManager(false) }} className={`p-2 rounded-xl border transition-colors ${showMenuManager ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]' : 'border-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="Manage Menu">
              <Edit3 className="w-5 h-5" />
            </button>
            <button onClick={() => { setShowAboutManager(!showAboutManager); setShowMenuManager(false); setShowAddForm(false) }} className={`p-2 rounded-xl border transition-colors ${showAboutManager ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]' : 'border-[#27272a] text-[#a1a1aa] hover:text-white'}`} title="Manage About Images">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button onClick={fetchOrders} disabled={loading} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={logout} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Menu Manager */}
        {showMenuManager && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#f97316]" />
                Manage Menu Items
              </h3>
              <button onClick={() => setShowAddForm(!showAddForm)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold transition-all">
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            {/* Add form */}
            {showAddForm && (
              <form onSubmit={handleAddItem} className="grid sm:grid-cols-5 gap-3 mb-4 p-4 rounded-xl bg-[#202024]">
                <input type="text" placeholder="Name" value={newItem.name} onChange={e => setNewItem(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50" />
                <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem(f => ({ ...f, price: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50" />
                <select value={newItem.category} onChange={e => setNewItem(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50">
                  <option value="ulam">Ulam</option>
                  <option value="silog">Silog</option>
                  <option value="shake">Shake</option>
                  <option value="solo">Solo</option>
                </select>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate">{newImage ? newImage.name : 'Image'}</span>
                  <input type="file" accept="image/*" onChange={e => setNewImage(e.target.files[0])} className="hidden" />
                </label>
                <button type="submit" disabled={adding || !newItem.name || !newItem.price} className="px-3 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50">
                  {adding ? 'Adding...' : 'Add'}
                </button>
              </form>
            )}

            {/* Menu items list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {menuItems.map(item => (
                <div key={item.id} className="rounded-xl bg-[#202024] p-3">
                  {editingId === item.id ? (
                    <div className="grid sm:grid-cols-6 gap-2">
                      <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="col-span-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50" />
                      <input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50" />
                      <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50">
                        <option value="ulam">Ulam</option>
                        <option value="silog">Silog</option>
                        <option value="shake">Shake</option>
                        <option value="solo">Solo</option>
                      </select>
                      <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181b] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors">
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-xs">{editImage ? editImage.name : 'Image'}</span>
                        <input type="file" accept="image/*" onChange={e => setEditImage(e.target.files[0])} className="hidden" />
                      </label>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(item.id)} className="p-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-all"><Save className="w-3.5 h-3.5" /></button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-all"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#18181b] overflow-hidden shrink-0">
                        <img src={imageUrl(item.image) || 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=80&q=60'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{item.name}</p>
                        <p className="text-xs text-[#71717a]">₱{item.price} &middot; {item.category}</p>
                      </div>
                      <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-all" title="Edit"><Upload className="w-3.5 h-3.5" /></button>
                      {(() => { const disabled = item.active === false; return (
                        <button onClick={async () => { try { await fetch(api(`/api/menu/${item.id}`), { method: 'PATCH', headers: { ...adminHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ active: disabled }) }); fetchMenu() } catch {} }}
                          className={['p-1.5 rounded-lg border transition-all', disabled ? 'bg-red-600/20 border-red-600/40 text-red-400' : 'border-[#27272a] text-[#a1a1aa] hover:text-green-400'].join(' ')}
                          title={disabled ? 'Disabled' : 'Enabled'}
                        >
                          <span className={['block w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center', disabled ? 'border-red-400' : 'border-[#27272a]'].join(' ')}>
                            <span className={['block w-1.5 h-1.5 rounded-full', disabled ? 'bg-red-400' : 'bg-transparent'].join(' ')} />
                          </span>
                        </button>
                      )})()}
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Hero Image */}
        <div className="mb-8 rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#f97316]" />
              Hero Image
            </h3>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202024] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors">
              <Upload className="w-4 h-4 shrink-0" />
              <span className="truncate">{heroFile ? heroFile.name : 'Choose image'}</span>
              <input type="file" accept="image/*" onChange={e => { setHeroFile(e.target.files[0]); setUploadError('') }} className="hidden" />
            </label>
            <button onClick={handleUploadHero} disabled={!heroFile || uploadingHero} className="px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50">
              {uploadingHero ? 'Uploading...' : 'Upload'}
            </button>

          </div>
          {uploadError && <p className="text-red-400 text-xs mb-4">{uploadError}</p>}
          <div className="aspect-[4/3] max-w-sm rounded-xl overflow-hidden border border-[#27272a] bg-[#202024]">
            <img src={heroImage || 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80'} alt="Hero" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* About Images Manager */}
        {showAboutManager && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 rounded-2xl border border-[#27272a] bg-[#18181b] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#f97316]" />
                Manage About Images
              </h3>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#202024] border border-[#27272a] text-[#a1a1aa] text-sm cursor-pointer hover:border-[#f97316]/50 transition-colors">
                <Upload className="w-4 h-4 shrink-0" />
                <span className="truncate">{aboutFile ? aboutFile.name : 'Choose image'}</span>
                <input type="file" accept="image/*" onChange={e => { setAboutFile(e.target.files[0]); setUploadError('') }} className="hidden" />
              </label>
              <button onClick={handleUploadAbout} disabled={!aboutFile || uploadingAbout} className="px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50">
                {uploadingAbout ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {uploadError && <p className="text-red-400 text-xs mb-4">{uploadError}</p>}

            {aboutImages.length === 0 && (
              <p className="text-sm text-[#71717a] text-center py-6">No images uploaded yet.</p>
            )}

            {aboutImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {aboutImages.map(item => (
                  <div key={item.id} className="group relative rounded-xl overflow-hidden border border-[#27272a] bg-[#202024] aspect-square">
                    <img src={imageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => handleDeleteAbout(item.id)} className="p-2 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Orders section */}
        {loading && orders.length === 0 && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[#f97316] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#a1a1aa]">Loading orders...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-red-400">Failed to load orders. Make sure the server is running.</p>
          </div>
        )}

        {!loading && !error && pending.length === 0 && done.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-[#27272a] mx-auto mb-4" />
            <p className="text-[#a1a1aa] font-medium">No orders yet</p>
            <p className="text-sm text-[#71717a] mt-1">Orders will appear here once customers place them.</p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Pending Orders ({pending.length})
            </h2>
            <div className="space-y-4">
              {pending.map((order, i) => <OrderCard key={order.id} order={order} index={i} showDone={false} />)}
            </div>
          </div>
        )}

        {done.length > 0 && (
          <div>
            <button onClick={() => setDoneOpen(!doneOpen)} className="flex items-center gap-2 text-lg font-semibold text-white mb-4 hover:text-[#a1a1aa] transition-colors">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Done Orders ({done.length})
              {doneOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {doneOpen && (
              <div className="space-y-4 opacity-70">
                {done.map((order, i) => <OrderCard key={order.id} order={order} index={i} showDone={true} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}