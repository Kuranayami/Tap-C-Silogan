import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Menu, X, ChefHat, User, Bike, Package, LogOut } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

const links = [
  { label: 'Home', id: 'home' },
  { label: 'Menu', id: 'menu' },
  { label: 'About', id: 'about' },
  { label: 'Contact', id: 'contact' },
]

export default function Navbar() {
  const { itemCount, openCart } = useCart()
  const { user, logout } = useAuth()
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
          ? 'bg-[#FFFBDA] border-b border-[#FFEC9E] shadow-md shadow-[#D48040]/5'
          : 'bg-[#FFFBDA]/90 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <a href="#home" className="flex items-center gap-2 group">
            <span className="text-2xl sm:text-xl font-bold tracking-tight text-[#D48040]">
              Tap C <span className="text-[#FFBB70] text-3xl">Silogan</span>
            </span>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <a
                key={l.id}
                href={'#' + l.id}
                className="text-sm font-medium text-[#D48040]/80 hover:text-[#D48040] transition-colors relative group"
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 right-0 h-px bg-[#FFBB70] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#/track"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFEC9E] bg-[#FFFBDA] text-[#D48040]/80 hover:text-[#D48040] hover:border-[#FFBB70] text-xs font-medium transition-all"
            >
              <Package className="w-3.5 h-3.5" /> Track
            </a>
            <a
              href="#/rider"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFEC9E] bg-[#FFFBDA] text-[#D48040]/80 hover:text-[#D48040] hover:border-[#FFBB70] text-xs font-medium transition-all"
            >
              <Bike className="w-3.5 h-3.5" /> Rider
            </a>
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <span className="text-xs text-[#D48040]/80">{user.name || 'User'}</span>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFEC9E] bg-[#FFFBDA] text-[#D48040]/80 hover:text-[#D48040] hover:border-[#D48040] text-xs font-medium transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            ) : (
              <a
                href="#/login"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFEC9E] bg-[#FFFBDA] text-[#D48040]/80 hover:text-[#D48040] hover:border-[#FFBB70] text-xs font-medium transition-all"
              >
                <User className="w-3.5 h-3.5" /> Sign In
              </a>
            )}
            <button
              onClick={openCart}
              className="relative p-2 text-[#D48040]/80 hover:text-[#D48040] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#D48040] text-[#FFFBDA] text-[10px] font-bold flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-[#D48040]/80 hover:text-[#D48040] transition-colors"
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
            className="md:hidden border-t border-[#FFEC9E] bg-[#FFFBDA] overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {links.map(l => (
                <a
                  key={l.id}
                  href={'#' + l.id}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left text-sm font-medium text-[#D48040]/80 hover:text-[#D48040] transition-colors py-2"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#/track"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#D48040]/80 hover:text-[#D48040] transition-colors py-2"
              >
                <Package className="w-4 h-4" /> Track Order
              </a>
              <a
                href="#/rider"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#D48040]/80 hover:text-[#D48040] transition-colors py-2"
              >
                <Bike className="w-4 h-4" /> Rider Dashboard
              </a>
              {user ? (
                <div className="py-2 border-t border-[#FFEC9E] pt-3 mt-1 space-y-2">
                  <span className="block text-sm text-[#D48040]/80">{user.name || 'User'}</span>
                  <button
                    onClick={() => { logout(); setMobileOpen(false) }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FFEC9E] text-[#D48040]/80 hover:text-[#D48040] text-xs font-medium transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              ) : (
                <a
                  href="#/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 w-full text-left text-sm font-medium text-[#D48040]/80 hover:text-[#D48040] transition-colors py-2"
                >
                  <User className="w-4 h-4" /> Sign In
                </a>
              )}
              <button
                onClick={() => { setMobileOpen(false); openCart() }}
                className="w-full mt-2 px-5 py-2.5 rounded-xl bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] text-sm font-semibold transition-all"
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