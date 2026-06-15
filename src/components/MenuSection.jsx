import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart, Minus } from 'lucide-react'
import { menuItems as localMenu } from '../data/menu'
import { useCart } from '../context/CartContext'
import { api, imageUrl } from '../api'

const categories = [
  { key: 'all', label: 'All' },
  { key: 'silog', label: 'Silog' },
  { key: 'ulam', label: 'Ulam' },
  { key: 'shake', label: 'Shakes' },
  { key: 'solo', label: 'Solo' },
  { key: 'extra', label: 'Extra' },
]

function MenuItemCard({ item, index, onAdd, addingId }) {
  const { items, addItem, removeItem, updateQuantity } = useCart()

  const cartQty = items.filter(i => i.id === item.id).reduce((s, i) => s + i.quantity, 0)

  const handleExtraIncrement = () => addItem(item)
  const handleExtraDecrement = () => {
    const entry = items.find(i => i.id === item.id)
    if (entry) {
      if (entry.quantity <= 1) removeItem(entry.key)
      else updateQuantity(entry.key, entry.quantity - 1)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="group relative rounded-2xl border-2 border-[#FFEC9E] bg-[#FFFBDA] overflow-hidden transition-all duration-300 hover:border-[#FFBB70] hover:shadow-xl hover:shadow-[#ED9455]/5"
      style={{ boxShadow: '0 10px 25px rgba(237, 148, 85, 0.05)' }}
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#FFEC9E]/30 border-b border-[#FFEC9E] group-hover:border-[#FFBB70] transition-colors">
        <img
          src={imageUrl(item.image) || 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=60'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="relative px-3 py-3 sm:px-4 sm:py-4 pr-4 sm:pr-5">
        <h3 className="text-sm sm:text-base font-semibold text-[#ED9455] truncate">
          {item.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          {item.category === 'extra' ? (
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-lg font-bold text-[#ED9455]">₱{item.price}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExtraDecrement}
                  disabled={cartQty === 0}
                  className="w-7 h-7 rounded-md border border-[#FFEC9E] text-[#ED9455]/60 hover:text-[#ED9455] hover:border-[#FFBB70] flex items-center justify-center transition-all disabled:opacity-30"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-[#ED9455] font-bold text-sm">{cartQty}</span>
                <button
                  onClick={handleExtraIncrement}
                  className="w-7 h-7 rounded-md bg-[#ED9455] hover:bg-[#302b26] text-[#FFFBDA] flex items-center justify-center transition-all active:scale-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-lg font-bold text-[#ED9455]">₱{item.price}</span>
              <button
                onClick={() => onAdd(item, [])}
                disabled={addingId === item.id}
                className="p-2 rounded-lg bg-[#ED9455] hover:bg-[#FFBB70] text-[#FFFBDA] transition-all active:scale-90 disabled:opacity-50"
              >
                {addingId === item.id ? (
                  <span className="block w-4 h-4 border-2 border-[#FFFBDA] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('all')
  const { addItem, openCart } = useCart()
  const [addingId, setAddingId] = useState(null)
  const [menuItems, setMenuItems] = useState(localMenu)

  useEffect(() => {
    fetch(api('/api/menu'))
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setMenuItems(data) })
      .catch(() => {})
  }, [])

  const visible = menuItems.filter(m => m.active !== false)
  const filtered = activeCategory === 'all'
    ? visible
    : visible.filter(m => m.category === activeCategory)

  const handleAdd = useCallback((item, chosen) => {
    setAddingId(item.id)
    addItem(item, chosen)
    setTimeout(() => setAddingId(null), 600)
  }, [addItem])

  return (
    <section id="menu" className="relative py-24 sm:py-32 scroll-mt-24 bg-[#FFFBDA]">
      <div className="absolute inset-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#ED9455]">
            Signature Dishes
          </h2>
          <p className="text-[#ED9455]/80 max-w-xl mx-auto">
            From classic silogs to refreshing shakes — every dish is made to satisfy.
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-[#ED9455] text-[#FFFBDA] shadow-md shadow-[#ED9455]/10'
                  : 'bg-[#FFFBDA] text-[#ED9455] border border-[#FFEC9E] hover:border-[#FFBB70]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            {filtered.map((item, i) => (
              <MenuItemCard key={item.id} item={item} index={i} onAdd={handleAdd} addingId={addingId} />
            ))}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <button
            onClick={openCart}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#ED9455] hover:border-[#FFBB70] font-medium transition-all shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 text-[#FFBB70]" />
            View Cart
          </button>
        </motion.div>
      </div>
    </section>
  )
}