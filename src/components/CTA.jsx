import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'

export default function CTA() {
  const { openCart } = useCart()

  return (
    <section className="relative py-24 sm:py-32 bg-[#FFFBDA]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="relative rounded-3xl border border-[#FFEC9E] bg-[#FFFBDA] p-8 sm:p-12 lg:p-16 text-center overflow-hidden"
          style={{ boxShadow: '0 10px 25px rgba(237, 148, 85, 0.04)' }}
        >


          <div className="relative">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#D48040]">
              Don't Wait –{' '}
              <span className="text-[#FFBB70]">
                Order Now!
              </span>
            </h2>
            <p className="text-[#4A3728] text-lg max-w-lg mx-auto mb-8 leading-relaxed">
              Late-night cravings won't satisfy themselves. Get your favorite
              silog meals and shakes delivered to your doorstep.
            </p>
            <button
              onClick={openCart}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-lg transition-all active:scale-95"
              style={{ boxShadow: '0 8px 20px rgba(237, 148, 85, 0.2)' }}
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