import { motion } from 'framer-motion'
import { Star, Clock, MapPin, ChevronRight } from 'lucide-react'
import { storeInfo } from '../data/menu'
import { useCart } from '../context/CartContext'

export default function Hero() {
  const { openCart } = useCart()

  return (
    <section id="home" className="relative min-h-screen flex items-start md:items-center pt-20 scroll-mt-20">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f97316]/5 via-transparent to-[#09090b] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#f97316]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-[#f59e0b]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs sm:text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-[#f97316]" />
              <span>{storeInfo.rating} ★ ({storeInfo.reviewCount} Reviews)</span>
              <span className="w-1 h-1 rounded-full bg-[#f97316]/40" />
              <span>Family-friendly</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Savor the{' '}
              <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">
                Taste
              </span>{' '}
              of Perfection.
            </h1>

            <p className="text-lg sm:text-xl text-[#a1a1aa] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Late-night cravings? We've got you covered. Tap C Silogan serves
              the best silog meals and fresh fruit shakes in Marikina.
            </p>

            <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start mb-10">
              <button
                onClick={openCart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all hover:shadow-lg hover:shadow-[#f97316]/30 active:scale-95"
              >
                Order Now
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('menu')
                  if (el) {
                    const top = el.getBoundingClientRect().top + window.scrollY - 80
                    window.scrollTo({ top, behavior: 'smooth' })
                  }
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/40 font-medium transition-all"
              >
                View Menu
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-[#71717a] justify-center lg:justify-start">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#f97316]" />
                {storeInfo.hours.days}, {storeInfo.hours.open} – {storeInfo.hours.close}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#f97316]" />
                {storeInfo.address}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-md mx-auto lg:max-w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-[#f97316]/20 to-[#f59e0b]/10 rounded-3xl blur-2xl" />
              <div className="relative w-full h-full rounded-3xl border border-[#27272a] bg-gradient-to-br from-[#18181b] to-[#202024] overflow-hidden group cursor-pointer shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10" />
                <img
                  src="https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=600&q=80"
                  alt="Lechon Kawali"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1aa]">Signature Dish</p>
                      <h3 className="text-xl font-bold">Lechon Kawali</h3>
                    </div>
                    <span className="text-2xl font-bold text-[#f97316]">₱140</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <button onClick={() => {
          const el = document.getElementById('menu')
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY - 80
            window.scrollTo({ top, behavior: 'smooth' })
          }
        }} className="text-[#71717a] hover:text-[#a1a1aa] transition-colors">
          <ChevronRight className="w-6 h-6 rotate-90" />
        </button>
      </div>
    </section>
  )
}
