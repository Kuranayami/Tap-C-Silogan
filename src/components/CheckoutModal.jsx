import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, MapPin } from 'lucide-react'
import { useCart, useCheckout } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { extractCoordinatesFromUrl, fetchZoneImage } from '../data/deliveryZone'

export default function CheckoutModal() {
  const { items, subtotal, deliveryFeeInZone, deliveryFeeOutOfZone, clearCart, closeCart } = useCart()
  const { checkoutOpen, closeCheckout } = useCheckout()
  const { user, token } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', contact: user?.phone || '', address: user?.address || '' })
  const [mapsLink, setMapsLink] = useState(user?.maps_link || '')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [resolving, setResolving] = useState(false)
  const [zoneImage, setZoneImage] = useState(null)
  const [inZone, setInZone] = useState(true)

  const deliveryFee = inZone ? deliveryFeeInZone : deliveryFeeOutOfZone
  const showTotal = subtotal + deliveryFee

  useEffect(() => {
    if (checkoutOpen) {
      fetchZoneImage().then(setZoneImage)
    }
  }, [checkoutOpen])

  useEffect(() => {
    if (checkoutOpen && token) {
      fetch(api('/api/auth/profile'), { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok && r.json())
        .then(d => {
          if (d) {
            setForm({ name: d.name || user?.name || '', contact: d.phone || user?.phone || '', address: d.address || user?.address || '' })
            setMapsLink(d.maps_link || user?.maps_link || '')
          }
        })
        .catch(() => {})
    }
  }, [checkoutOpen])

  const resolveLink = async (link) => {
    if (!link) return
    if (extractCoordinatesFromUrl(link)) return
    if (!link.includes('google') && !link.includes('goo.gl') && !link.includes('maps.app')) return
    setResolving(true)
    try {
      await fetch(api('/api/location/resolve'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      })
    } catch {} finally {
      setResolving(false)
    }
  }

  const handleMapsLinkChange = (value) => {
    setMapsLink(value)
    setError('')
    resolveLink(value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.contact || !form.address) {
      setError('Please fill in all fields')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(api('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          customer_name: form.name,
          customer_contact: form.contact,
          address: form.address,
          maps_link: mapsLink || null,
          in_zone: inZone,
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            addons: i.addons || [],
          })),
          subtotal,
          delivery_fee: deliveryFee,
          total: showTotal,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Order submission failed')
      }

      setDone(true)
      clearCart()
      closeCart()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const close = () => {
    if (!submitting) {
      closeCheckout()
      setDone(false)
      setError('')
      setMapsLink('')
    }
  }

  return (
    <AnimatePresence>
      {checkoutOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-[90] bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl shadow-black/50 flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#27272a]">
              <h2 className="text-lg font-semibold text-white">
                {done ? 'Order Placed!' : 'Checkout'}
              </h2>
              <button
                onClick={close}
                disabled={submitting}
                className="p-2 text-[#a1a1aa] hover:text-white transition-colors rounded-lg hover:bg-[#18181b] disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                <p className="text-[#a1a1aa] text-sm mb-6">
                  Your order has been placed successfully. We'll prepare it right away!
                </p>
                <a
                  href="#/track"
                  onClick={close}
                  className="inline-block mb-3 px-6 py-2.5 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-semibold transition-all text-sm"
                >
                  Track Your Order
                </a>
                <button
                  onClick={close}
                  className="block mx-auto px-6 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all"
                >
                  Continue Browsing
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                  {zoneImage && (
                    <div className="rounded-xl overflow-hidden border border-[#27272a] bg-[#202024]">
                      <img src={zoneImage} alt="Delivery Zone" className="w-full aspect-video object-cover" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#18181b] border border-[#27272a]">
                    <MapPin className="w-5 h-5 text-[#f97316] shrink-0" />
                    <span className="text-sm text-[#a1a1aa]">Are you within our delivery zone?</span>
                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setInZone(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${inZone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#202024] text-[#71717a] border border-[#27272a] hover:text-white'}`}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setInZone(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!inZone ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-[#202024] text-[#71717a] border border-[#27272a] hover:text-white'}`}
                      >
                        No
                      </button>
                    </div>
                  </div>

                  {items.map(item => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">
                          {item.quantity}x {item.name}
                        </p>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-xs text-[#a1a1aa]">
                            + {item.addons.map(a => a.name + (a.quantity > 1 ? ` (${a.quantity})` : '')).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-white font-medium ml-4">
                        ₱{(item.price + (item.addons || []).reduce((s, a) => s + a.price * (a.quantity || 1), 0)) * item.quantity}
                      </span>
                    </div>
                  ))}

                  <div className="border-t border-[#27272a] pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-[#a1a1aa]">
                      <span>Subtotal</span>
                      <span>₱{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#a1a1aa]">
                      <span>Delivery {inZone ? '(In Zone)' : '(Out of Zone)'}</span>
                      <span>₱{deliveryFee}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-[#27272a]">
                      <span>Total</span>
                      <span className="text-[#f97316]">₱{showTotal}</span>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3 pt-2">
                    <input
                      type="text"
                      placeholder="Your Name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                    />
                    <input
                      type="tel"
                      placeholder="Contact Number"
                      value={form.contact}
                      onChange={e => setForm(f => ({ ...f, contact: e.target.value.replace(/\D/g, '') }))}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                    />
                    <div>
                      <input
                        type="text"
                        placeholder="House/street address"
                        value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Paste Google Maps link (Required)"
                          value={mapsLink}
                          onChange={e => handleMapsLinkChange(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors pr-10"
                        />
                        {resolving && (
                          <Loader2 className="w-4 h-4 animate-spin text-[#f97316] absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <p className="text-[#71717a] text-xs mt-1.5">
                        Helps the rider find your exact location. Open Google Maps, drop a pin, and paste the link.
                      </p>
                    </div>
                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full px-4 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all hover:shadow-lg hover:shadow-[#f97316]/30 active:scale-[0.98] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Placing Order...
                        </>
                      ) : (
                        'Place Order'
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
