import { motion } from 'framer-motion'
import { ArrowRight, ChefHat } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function CTA() {
  const { openCart } = useCart()

  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative rounded-3xl border border-[#27272a] bg-gradient-to-br from-[#18181b] to-[#202024] p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
        >
          <div className="absolute top-0 -right-20 w-64 h-64 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Don't Wait –{' '}
              <span className="bg-[#EBB866] bg-clip-text text-transparent">
                Order Now!
              </span>
            </h2>
            <p className="text-[#a1a1aa] text-lg max-w-lg mx-auto mb-8">
              Late-night cravings won't satisfy themselves. Get your favorite
              silog meals and shakes delivered to your doorstep.
            </p>
            <button
              onClick={openCart}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#EBB866] hover:bg-[#EBB866] text-white font-semibold text-lg transition-all hover:shadow-xl hover:shadow-[#EBB866]/30 active:scale-95"
            >
              Place Your Order
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
