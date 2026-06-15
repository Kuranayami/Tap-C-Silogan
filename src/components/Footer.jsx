import { motion } from 'framer-motion'
import { Clock, MapPin, Phone, AlertTriangle } from 'lucide-react'
import { storeInfo } from '../data/menu'

export default function Footer() {
  const now = new Date()
  const hour = now.getHours()
  const isOpen = hour >= 19 || hour < 1

  return (
    <footer id="contact" className="relative border-t border-[#FFEC9E] bg-[#FFFBDA] scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg font-bold text-[#D48040]">
                Tap C <span className="text-[#FFBB70]">Silogan</span>
              </span>
            </div>
            <p className="text-sm text-[#4A3728] leading-relaxed">
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
            <h3 className="font-semibold text-[#D48040] mb-4">Operating Hours</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2 text-[#4A3728]">
                <Clock className="w-4 h-4 mt-0.5 text-[#FFBB70] shrink-0" />
                <div>
                  <p>{storeInfo.hours.days}</p>
                  <p>{storeInfo.hours.open} – {storeInfo.hours.close}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#4A3728]">
                <AlertTriangle className="w-3 h-3 text-[#FFBB70]" />
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
            <h3 className="font-semibold text-[#D48040] mb-4">Contact</h3>
            <div className="space-y-3 text-sm">
              <a
                href={`tel:${storeInfo.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-[#4A3728] hover:text-[#FFBB70] transition-colors"
              >
                <Phone className="w-4 h-4 text-[#FFBB70] shrink-0" />
                <span>{storeInfo.phone}</span>
              </a>
              <div className="flex items-start gap-2 text-[#4A3728]">
                <MapPin className="w-4 h-4 mt-0.5 text-[#FFBB70] shrink-0" />
                <div>
                  <p>{storeInfo.address}</p>
                  <p className="text-[#4A3728]/50 text-xs mt-1">{storeInfo.addressFull}</p>
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
            <h3 className="font-semibold text-[#D48040] mb-4">Find Us</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2 text-[#4A3728]">
                <MapPin className="w-4 h-4 mt-0.5 text-[#FFBB70] shrink-0" />
                <div>
                  <p>{storeInfo.address}</p>
                  <p className="text-[#4A3728]/50 text-xs mt-1">{storeInfo.addressFull}</p>
                </div>
              </div>
              <a
                href={storeInfo.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#4A3728] hover:text-[#FFBB70] font-medium transition-colors"
              >
                <MapPin className="w-4 h-4 text-[#FFBB70]" />
                <span>View in Google Maps</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="border-t border-[#FFEC9E] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4A3728]">
          <p>© {new Date().getFullYear()} Tap C Silogan. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#/cashier" className="hover:text-[#FFBB70] transition-colors">Cashier</a>
            <a href="#/admin" className="hover:text-[#FFBB70] transition-colors">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  )
}