import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Eye, ImageIcon } from 'lucide-react'
import { api, imageUrl } from '../api'

export default function MediaShowcase() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(api('/api/about'))
      .then(res => res.ok ? res.json() : [])
      .then(data => setImages(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section id="about" className="relative py-24 sm:py-32 scroll-mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs sm:text-sm font-medium mb-4">
            <Eye className="w-4 h-4" />
            A Feast for Your Eyes
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Behind the{' '}
            <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">
              Flavors
            </span>
          </h2>
        </motion.div>

        {!loading && images.length === 0 && (
          <div className="text-center py-20 text-[#71717a]">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No images yet.</p>
          </div>
        )}

        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {images.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className={`overflow-hidden rounded-2xl border border-[#27272a] bg-[#18181b] group cursor-pointer ${
                  i === 0 && images.length > 1 ? 'row-span-2 col-span-2' : ''
                } ${i === images.length - 1 && i !== 0 && images.length % 3 === 2 ? 'col-span-2' : ''}`}
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={imageUrl(item.image)}
                    alt={`About ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
