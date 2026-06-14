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
    <section id="about" className="relative py-24 sm:py-32 scroll-mt-24 bg-[#FFFBDA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFEC9E] border border-[#FFBB70] text-[#ED9455] text-xs sm:text-sm font-medium mb-4">
            <Eye className="w-4 h-4" />
            A Feast for Your Eyes
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#ED9455]">
            Behind the{' '}
            <span className="text-[#FFBB70]">
              Flavors
            </span>
          </h2>
        </motion.div>

        {!loading && images.length === 0 && (
          <div className="text-center py-20 text-[#ED9455]/60">
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
                className={`overflow-hidden rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] group cursor-pointer ${
                  i === 0 && images.length > 1 ? 'row-span-2 col-span-2' : ''
                } ${i === images.length - 1 && i !== 0 && images.length % 3 === 2 ? 'col-span-2' : ''}`}
                style={{ boxShadow: '0 10px 25px rgba(237, 148, 85, 0.04)' }}
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