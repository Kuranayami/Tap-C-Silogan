import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, ShoppingCart } from 'lucide-react'
import { menuItems as localMenu, addons } from '../data/menu'
import { useCart } from '../context/CartContext'
import { api, imageUrl } from '../api'

const categories = [
  { key: 'all', label: 'All' },
  { key: 'silog', label: 'Silog' },
  { key: 'ulam', label: 'Ulam' },
  { key: 'shake', label: 'Shakes' },
  { key: 'solo', label: 'Solo' },
]

const categoryImages = {
  silog: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&q=80',
  ulam: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  shake: 'https://images.unsplash.com/photo-1553530666-ba11a7e3885a?w=400&q=80',
  solo: 'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=400&q=80',
}

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('all')
  const { addItem, openCart } = useCart()
  const [addingId, setAddingId] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState({})
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

  const handleAdd = (item) => {
    const chosen = selectedAddons[item.id] || []
    setAddingId(item.id)
    addItem(item, chosen)
    setSelectedAddons(prev => ({ ...prev, [item.id]: [] }))
    setTimeout(() => setAddingId(null), 600)
  }

  const toggleAddon = (itemId, addon) => {
    setSelectedAddons(prev => {
      const current = prev[itemId] || []
      const exists = current.find(a => a.id === addon.id)
      return {
        ...prev,
        [itemId]: exists
          ? current.filter(a => a.id !== addon.id)
          : [...current, addon],
      }
    })
  }

  return (
    <section id="menu" className="relative py-24 sm:py-32 scroll-mt-24">
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#18181b]/30 to-[#09090b] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Signature{' '}
            <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">
              Dishes
            </span>
          </h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto">
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
                  ? 'bg-[#f97316] text-white shadow-lg shadow-[#f97316]/20'
                  : 'bg-[#18181b] text-[#a1a1aa] hover:text-white border border-[#27272a] hover:border-[#f97316]/30'
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
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="group relative rounded-2xl border border-[#27272a] bg-[#18181b] overflow-hidden hover:border-[#f97316]/30 transition-all hover:shadow-xl hover:shadow-black/30"
              >
                <div className="aspect-[4/3] overflow-hidden bg-[#202024]">
                  <img
                    src={imageUrl(item.image) || categoryImages[item.category] || categoryImages.ulam}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-[#f97316]">
                      ₱{item.price}
                    </span>
                    <button
                      onClick={() => handleAdd(item)}
                      disabled={addingId === item.id}
                      className="p-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white transition-all active:scale-90 disabled:opacity-50"
                    >
                      {addingId === item.id ? (
                        <span className="block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {addons.map(addon => {
                      const isSelected = (selectedAddons[item.id] || []).find(a => a.id === addon.id)
                      return (
                        <button
                          key={addon.id}
                          onClick={(e) => { e.stopPropagation(); toggleAddon(item.id, addon) }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                            isSelected
                              ? 'bg-[#f97316]/20 border-[#f97316]/40 text-[#f97316]'
                              : 'border-[#27272a] text-[#71717a] hover:text-[#a1a1aa]'
                          }`}
                        >
                          +{addon.name} ₱{addon.price}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#18181b] border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/40 font-medium transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            View Cart
          </button>
        </motion.div>
      </div>
    </section>
  )
}