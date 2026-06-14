import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { api } from '../api'

const FALLBACK_TESTIMONIALS = []

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([])

  useEffect(() => {
    fetch(api('/api/config'))
      .then(res => res.ok ? res.json() : { testimonials: [] })
      .then(data => setTestimonials(data.testimonials?.length ? data.testimonials : FALLBACK_TESTIMONIALS))
      .catch(() => setTestimonials(FALLBACK_TESTIMONIALS))
  }, [])

  if (testimonials.length === 0) return null

  return (
    <section className="relative py-24 sm:py-32 bg-[#FFFBDA]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#FFFBDA] via-transparent to-[#FFFBDA] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 text-[#ED9455]">
            They{' '}
            <span className="text-[#FFBB70]">
              Love
            </span>{' '}
            Us
          </h2>
          <p className="text-[#ED9455]/80 max-w-xl mx-auto">
            Here's what our customers have to say about their experience.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-6 hover:border-[#FFBB70] transition-all hover:shadow-xl hover:shadow-[#ED9455]/5"
              style={{ boxShadow: '0 10px 25px rgba(237, 148, 85, 0.04)' }}
            >
              <Quote className="w-8 h-8 text-[#FFBB70]/20 mb-4" />
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${
                      j < t.rating
                        ? 'fill-[#FFBB70] text-[#FFBB70]'
                        : 'text-[#FFEC9E]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#ED9455]/90 leading-relaxed mb-4 italic">
                "{t.text}"
              </p>
              <p className="text-sm font-semibold text-[#ED9455]">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}