import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2, MapPin } from 'lucide-react'
import { useCart, useCheckout } from '../context/CartContext'
import { api } from '../api'
import { IVC_POLYGON, DELIVERY_FEE, isInsideIVC, extractCoordinatesFromUrl, addressMentionsIVC } from '../data/deliveryZone'

export default function CheckoutModal() {
  const { items, subtotal, total, clearCart, closeCart } = useCart()
  const { checkoutOpen, closeCheckout } = useCheckout()
  const [form, setForm] = useState({ name: '', contact: '', address: '' })
  const [mapsLink, setMapsLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [zoneStatus, setZoneStatus] = useState(null) // null | 'validating' | 'inside' | 'outside'

  const deliveryFee = zoneStatus === 'inside' ? DELIVERY_FEE : 0
  const showTotal = subtotal + deliveryFee

  const validateAddress = (address, link) => {
    const text = address || ''
    const linkUrl = link || ''
    const coords = extractCoordinatesFromUrl(linkUrl)

    if (coords) {
      if (isInsideIVC(coords.lat, coords.lng)) return 'inside'
      return 'outside'
    }

    // No link — check address text for IVC keywords
    const mention = addressMentionsIVC(text)
    if (mention === true) return 'inside'
    if (mention === 'needs_verification') return 'needs_link'

    return 'outside'
  }

  const handleMapsLinkChange = (value) => {
    setMapsLink(value)
    setError('')
    const result = validateAddress(form.address, value)
    setZoneStatus(result)
  }

  const handleAddressChange = (value) => {
    setForm(f => ({ ...f, address: value }))
    setError('')
    const result = validateAddress(value, mapsLink)
    setZoneStatus(result)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.contact || !form.address) {
      setError('Please fill in all fields')
      return
    }

    // Re-validate zone
    const result = validateAddress(form.address, mapsLink)
    setZoneStatus(result)
    if (result === 'outside') {
      setError('Delivery is currently restricted to Barangay IVC only. Your address falls outside our local radius.')
      return
    }
    if (result === 'needs_link') {
      setError('Please paste your Google Maps location link so we can verify your address is within our delivery zone.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(api('/api/orders'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_contact: form.contact,
          address: form.address,
          maps_link: mapsLink || null,
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
      setZoneStatus(null)
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
                <button
                  onClick={close}
                  className="px-6 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all"
                >
                  Continue Browsing
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
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
                            + {item.addons.map(a => a.name).join(', ')}
                          </p>
                        )}
                      </div>
                      <span className="text-white font-medium ml-4">
                        ₱{(item.price + (item.addons || []).reduce((s, a) => s + a.price, 0)) * item.quantity}
                      </span>
                    </div>
                  ))}

                  {/* Zone status banner */}
                  {zoneStatus === 'outside' && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-400">Outside delivery zone</p>
                          <p className="text-xs text-red-300/70 mt-1">
                            Delivery is currently restricted to Barangay IVC only. Your address falls outside our local radius.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {zoneStatus === 'inside' && (
                    <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-400">Within delivery zone</p>
                          <p className="text-xs text-green-300/70 mt-1">Your address is inside Barangay IVC. ✓</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-[#27272a] pt-3 space-y-1">
                    <div className="flex justify-between text-sm text-[#a1a1aa]">
                      <span>Subtotal</span>
                      <span>₱{subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#a1a1aa]">
                      <span>Delivery</span>
                      <span>{deliveryFee > 0 ? `₱${deliveryFee}` : '—'}</span>
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
                        onChange={e => handleAddressChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Paste Google Maps link (for zone verification)"
                        value={mapsLink}
                        onChange={e => handleMapsLinkChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                      />
                      <p className="text-[#71717a] text-xs mt-1.5">
                        Open Google Maps, drop a pin at your location, and paste the link here
                      </p>
                    </div>
                    {error && (
                      <p className="text-red-400 text-xs">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={submitting || zoneStatus === 'outside'}
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
