import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X, ChefHat } from 'lucide-react'
import { useCart } from '../context/CartContext'

const links = [
  { label: 'Home', id: 'home' },
  { label: 'Menu', id: 'menu' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) {
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }) } catch {}
    location.hash = id
  }
}

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <button onClick={() => scrollTo('home')} className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f59e0b] flex items-center justify-center shadow-lg shadow-[#f97316]/20 group-hover:shadow-[#f97316]/40 transition-shadow">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Tap C <span className="text-[#f97316]">Silogan</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#f97316] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
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
                <button
                  key={l.id}
                  onClick={() => { setMobileOpen(false); scrollTo(l.id) }}
                  className="block w-full text-left text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors py-2"
                >
                  {l.label}
                </button>
              ))}
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
