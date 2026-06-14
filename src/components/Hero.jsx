import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Clock, MapPin, ChevronRight, ChefHat } from 'lucide-react'
import { storeInfo } from '../data/menu'
import { useCart } from '../context/CartContext'
import { api, imageUrl } from '../api'

const DEFAULT_HERO = null

export default function Hero() {
  const { openCart } = useCart()
  const [heroImg, setHeroImg] = useState(null)
  const [heroDish, setHeroDish] = useState({ name: 'Lechon Kawali', price: 140 })

  useEffect(() => {
    fetch(api('/api/config')).then(r => r.ok ? r.json() : {}).then(d => {
      if (d.heroImage) setHeroImg(imageUrl(d.heroImage))
      if (d.heroDishName) setHeroDish(prev => ({ ...prev, name: d.heroDishName }))
      if (d.heroDishPrice) setHeroDish(prev => ({ ...prev, price: d.heroDishPrice }))
    }).catch(() => {})
  }, [])

  return (
    <section id="home" className="relative min-h-screen flex items-start md:items-center pt-20 scroll-mt-20">
      <div className="absolute inset-0  via-transparent to-[#09090b] pointer-events-none" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 /5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EBB866]/10 border border-[#EBB866]/20 text-[#EBB866] text-xs sm:text-sm font-medium mb-6">
              <Star className="w-4 h-4 fill-[#EBB866]" />
              <span>{storeInfo.rating} ★ ({storeInfo.reviewCount} Reviews)</span>
              <span className="w-1 h-1 rounded-full bg-[#EBB866]/40" />
              <span>Family-friendly</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
              Savor the{' '}
              <span className="bg-[#f97316] bg-clip-text text-transparent">
                Taste
              </span>{' '}
              of
              <span className='bg-[#f97316] bg-clip-text text-transparent'> Perfection</span>
              .

            </h1>

            <p className="text-lg sm:text-xl text-[#a1a1aa] max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
              Late-night cravings? We've got you covered. Tap C Silogan serves
              the best silog meals and fresh fruit shakes in Marikina.
            </p>

            <div className="flex flex-wrap items-center gap-4 justify-center lg:justify-start mb-10">
              <button
                onClick={openCart}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#964b00] hover:bg-[#ea580c] text-white font-semibold transition-all hover:shadow-lg hover:shadow-[#f97316]/30 active:scale-95"
              >
                Order Now
                <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href="#menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#f97316]/40 font-medium transition-all"
              >
                View Menu
              </a>
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
              <div className="absolute inset-0 bg-[#996515] rounded-3xl blur-sm" />
              <div className="relative w-full h-full rounded-3xl border border-[#27272a] bg-gradient-to-br from-[#18181b] to-[#202024] overflow-hidden group cursor-pointer shadow-2xl shadow-black/40">
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent z-10" />
                {heroImg ? (
                  <img
                    src={heroImg}
                    alt={heroDish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <ChefHat className="w-16 h-16 text-[#27272a] mx-auto mb-2" />
                      <p className="text-sm text-[#27272a]">No hero image set</p>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1aa]">Signature Dish</p>
                      <h3 className="text-xl font-bold">{heroDish.name}</h3>
                    </div>
                    <span className="text-2xl font-bold text-[#f97316]">₱{heroDish.price}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <a href="#menu" className="text-[#71717a] hover:text-[#a1a1aa] transition-colors">
          <ChevronRight className="w-6 h-6 rotate-90" />
        </a>
      </div>
    </section>
  )
}
