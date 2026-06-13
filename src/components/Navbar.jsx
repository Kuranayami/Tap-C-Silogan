import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X, ChefHat, User, Bike, Package, LogOut, Edit3, Check, Loader2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

const links = [
  { label: 'Home', id: 'home' },
  { label: 'Menu', id: 'menu' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, token, logout, updateUser } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState('')
  const [needsOtp, setNeedsOtp] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSent, setOtpSent] = useState(false)

  const startEditName = () => {
    setNewName(user?.name || '')
    setEditingName(true)
    setNameError('')
    setNeedsOtp(false)
    setOtpCode('')
    setOtpSent(false)
  }

  const cancelEditName = () => {
    setEditingName(false)
    setNameError('')
    setNeedsOtp(false)
    setOtpCode('')
    setOtpSent(false)
  }

  const handleSaveName = async () => {
    if (!newName.trim()) { setNameError('Name cannot be empty'); return }
    setNameLoading(true)
    setNameError('')
    try {
      const res = await fetch(api('/api/auth/profile'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName.trim(), otp_verified: needsOtp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update name')
      if (data.needs_otp) {
        setNeedsOtp(true)
        if (!otpSent) {
          await fetch(api('/api/auth/otp/send'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email }),
          })
          setOtpSent(true)
        }
        return
      }
      updateUser({ name: data.name, name_edited: data.name_edited })
      cancelEditName()
    } catch (err) {
      setNameError(err.message)
    } finally {
      setNameLoading(false)
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#09090be0] backdrop-blur-xl border-b border-[#27272a] shadow-lg shadow-black/20'
          : 'bg-[#09090b]/80 backdrop-blur-xl'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <a href="#home" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-[#f97316]/20 group-hover:shadow-[#f97316]/40 transition-shadow">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Tap C <span className="text-[#f97316]">Silogan</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a
                key={l.id}
                href={'#' + l.id}
                className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#f97316] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/track"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-[#f97316] hover:border-[#f97316]/30 text-xs font-medium transition-all"
            >
              <Package className="w-3.5 h-3.5" /> Track
            </a>
            <a
              href="#/rider"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-medium transition-all"
            >
              <Bike className="w-3.5 h-3.5" /> Rider
            </a>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-28 px-2 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-xs focus:outline-none focus:border-[#f97316]/50"
                      placeholder="Your name"
                      autoFocus
                    />
                    {!needsOtp ? (
                      <>
                        <button onClick={handleSaveName} disabled={nameLoading} className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Save">
                          {nameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={cancelEditName} className="p-1 rounded-lg text-[#71717a] hover:text-white transition-all" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1">
                        <input
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-20 px-2 py-1 rounded-lg bg-[#18181b] border border-[#27272a] text-white text-xs text-center tracking-widest focus:outline-none focus:border-[#f97316]/50"
                          placeholder="000000"
                          maxLength={6}
                          autoFocus
                        />
                        <button onClick={handleSaveName} disabled={nameLoading || otpCode.length !== 6} className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Verify OTP">
                          {nameLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={cancelEditName} className="p-1 rounded-lg text-[#71717a] hover:text-white transition-all" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    {nameError && <span className="text-red-400 text-[10px]">{nameError}</span>}
                  </div>
                ) : (
                  <>
                    <span className="text-xs text-[#a1a1aa]">{user.name || 'User'}</span>
                    <button onClick={startEditName} className="p-1 rounded-lg text-[#71717a] hover:text-[#f97316] transition-all" title="Edit name"><Edit3 className="w-3 h-3" /></button>
                  </>
                )}
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 hover:border-red-500/30 text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <a
                href="#/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/30 text-xs font-medium transition-all"
              >
                <User className="w-3.5 h-3.5" /> Sign In
              </a>
            )}
            <button
              onClick={openCart}
              className="relative p-2 text-[#a1a1aa] hover:text-white transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#f97316] text-white text-[10px] font-bold flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#a1a1aa] hover:text-white transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[#27272a] bg-[#09090be0] backdrop-blur-xl overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {links.map(l => (
                <a
                  key={l.id}
                  href={'#' + l.id}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors py-2"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#/track"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#a1a1aa] hover:text-[#f97316] transition-colors py-2"
              >
                <Package className="w-4 h-4" /> Track Order
              </a>
              <a
                href="#/rider"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#a1a1aa] hover:text-emerald-400 transition-colors py-2"
              >
                <Bike className="w-4 h-4" /> Rider Dashboard
              </a>
              {user ? (
                <div className="py-2 border-t border-[#27272a] pt-3 mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#a1a1aa]">{user.name || 'User'}</span>
                    <button onClick={startEditName} className="p-1 rounded-lg text-[#71717a] hover:text-[#f97316] transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                  </div>
                  {editingName && (
                    <div className="space-y-1">
                      <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[#09090b] border border-[#27272a] text-white text-xs focus:outline-none focus:border-[#f97316]/50" placeholder="Your name" autoFocus />
                      {needsOtp && (
                        <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full px-2 py-1.5 rounded-lg bg-[#09090b] border border-[#27272a] text-white text-xs text-center tracking-widest focus:outline-none focus:border-[#f97316]/50" placeholder="Enter OTP code" maxLength={6} />
                      )}
                      <div className="flex gap-1">
                        <button onClick={handleSaveName} disabled={nameLoading || (needsOtp && otpCode.length !== 6)} className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all disabled:opacity-50">{nameLoading ? 'Saving...' : needsOtp ? 'Verify OTP' : 'Save'}</button>
                        <button onClick={cancelEditName} className="px-3 py-1 rounded-lg border border-[#27272a] text-[#71717a] hover:text-white text-xs transition-all">Cancel</button>
                      </div>
                      {nameError && <p className="text-red-400 text-[10px]">{nameError}</p>}
                    </div>
                  )}
                  <button
                    onClick={() => { logout(); setMobileOpen(false) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-red-400 hover:border-red-500/30 text-xs font-medium transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              ) : (
                <a
                  href="#/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors py-2"
                >
                  <User className="w-4 h-4" /> Sign In
                </a>
              )}
              <button
                onClick={() => { setMobileOpen(false); openCart() }}
                className="w-full mt-2 px-5 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold transition-all"
              >
                Order Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
