import { motion } from 'framer-motion'
import { Clock, MapPin, Phone, ChefHat, AlertTriangle } from 'lucide-react'
import { storeInfo } from '../data/menu'

export default function Footer() {
  const now = new Date()
  const hour = now.getHours()
  const isOpen = hour >= 19 || hour < 1

  return (
    <footer id="contact" className="relative border-t border-[#27272a] scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f97316] to-[#f59e0b] flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">
                Tap C <span className="text-[#f97316]">Silogan</span>
              </span>
            </div>
            <p className="text-sm text-[#a1a1aa] leading-relaxed">
              Serving the best silog meals and fresh fruit shakes in Marikina.
              Late-night cravings, sorted.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="font-semibold text-white mb-4">Operating Hours</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-[#a1a1aa]">
                <Clock className="w-4 h-4 mt-0.5 text-[#f97316] shrink-0" />
                <div>
                  <p>{storeInfo.hours.days}</p>
                  <p>{storeInfo.hours.open} – {storeInfo.hours.close}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 text-xs ${isOpen ? 'text-green-400' : 'text-red-400'}`}>
                <AlertTriangle className="w-3 h-3" />
                <span>
                  {isOpen ? 'Open now' : 'Closed — opens at 7:00 PM'}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="font-semibold text-white mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <a
                href={`tel:${storeInfo.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-[#a1a1aa] hover:text-[#f97316] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#f97316] shrink-0" />
                <span>{storeInfo.phone}</span>
              </a>
              <div className="flex items-start gap-2 text-[#a1a1aa]">
                <MapPin className="w-4 h-4 mt-0.5 text-[#f97316] shrink-0" />
                <div>
                  <p>{storeInfo.address}</p>
                  <p className="text-[#71717a] text-xs mt-1">{storeInfo.addressFull}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="font-semibold text-white mb-4">Find Us</h3>
            <a
              href={storeInfo.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#27272a] bg-[#18181b] aspect-[4/3] hover:border-[#f97316]/50 hover:bg-[#202024] transition-all group"
            >
              <MapPin className="w-10 h-10 text-[#f97316] group-hover:scale-110 transition-transform" />
              <div className="text-center">
                <p className="text-sm font-medium text-white">{storeInfo.address}</p>
                <p className="text-xs text-[#71717a] mt-1">View in Google Maps</p>
              </div>
            </a>
          </motion.div>
        </div>
      </div>

      <div className="border-t border-[#27272a] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717a]">
          <p>© {new Date().getFullYear()} Tap C Silogan. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#/admin" className="hover:text-[#f97316] transition-colors">Admin</a>
            <span>{storeInfo.priceRange}</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
