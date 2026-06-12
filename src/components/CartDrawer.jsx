import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, Trash2, ShoppingCart, ArrowRight } from 'lucide-react'
import { useCart, useCheckout } from '../context/CartContext'

export default function CartDrawer() {
  const {
    items,
    itemCount,
    subtotal,
    total,
    cartOpen,
    closeCart,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart()
  const { openCheckout } = useCheckout()

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-[70] bg-[#09090b] border-l border-[#27272a] shadow-2xl shadow-black/50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#27272a]">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#f97316]" />
                <h2 className="text-lg font-semibold text-white">
                  Your Order
                </h2>
                {itemCount > 0 && (
                  <span className="text-xs text-[#a1a1aa]">({itemCount} items)</span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 text-[#a1a1aa] hover:text-white transition-colors rounded-lg hover:bg-[#18181b]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingCart className="w-16 h-16 text-[#27272a] mb-4" />
                  <p className="text-[#a1a1aa] font-medium">Your cart is empty</p>
                  <p className="text-sm text-[#71717a] mt-1">Add some delicious items!</p>
                </div>
              ) : (
                items.map(item => (
                  <motion.div
                    key={item.key}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#27272a] bg-[#18181b] p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {item.name}
                        </h3>
                        {item.addons && item.addons.length > 0 && (
                          <p className="text-xs text-[#a1a1aa] mt-1">
                            + {item.addons.map(a => a.name + (a.quantity > 1 ? ` (${a.quantity})` : '')).join(', ')}
                          </p>
                        )}
                        <p className="text-sm font-bold text-[#f97316] mt-2">
                          ₱{item.price + (item.addons || []).reduce((s, a) => s + a.price * (a.quantity || 1), 0)} each
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="p-1.5 text-[#71717a] hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/30 transition-all"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/30 transition-all"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-white">
                        ₱{(item.price + (item.addons || []).reduce((s, a) => s + a.price * (a.quantity || 1), 0)) * item.quantity}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-[#27272a] p-4 sm:p-6 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-[#a1a1aa]">
                    <span>Subtotal</span>
                    <span>₱{subtotal}</span>
                  </div>
                  <div className="flex justify-between text-[#a1a1aa]">
                    <span>Delivery Fee</span>
                    <span className="text-[#71717a] text-xs">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-[#27272a]">
                    <span>Total</span>
                    <span className="text-[#f97316]">₱{total}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearCart}
                    className="px-4 py-2.5 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white text-sm font-medium transition-all"
                  >
                    Clear
                  </button>
                  <button
                    onClick={openCheckout}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[#f97316]/30 active:scale-[0.98] inline-flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
