import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { api } from '../api'

const FALLBACK_TESTIMONIALS = [
  { name: 'Maria Santos', text: 'Best tapsilog in Marikina! The garlic rice is perfectly cooked and the portions are generous. Late night cravings solved!', rating: 5 },
  { name: 'Jose R.', text: 'Their fresh fruit shakes are incredible. I love the dragon fruit shake — so refreshing after a long day. Highly recommend!', rating: 5 },
  { name: 'Ana Cruz', text: 'Family-friendly place with amazing lechon kawali. Crunchy on the outside, tender inside. Will definitely order again!', rating: 4 },
  { name: 'Carlos M.', text: 'Consistently good food at affordable prices. The staff are friendly and service is quick. My go-to for late dinner.', rating: 5 },
]

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
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#09090b] via-[#18181b]/20 to-[#09090b] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            They{' '}
            <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">
              Love
            </span>{' '}
            Us
          </h2>
          <p className="text-[#a1a1aa] max-w-xl mx-auto">
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
              className="relative rounded-2xl border border-[#27272a] bg-[#18181b] p-6 hover:border-[#f97316]/20 transition-all hover:shadow-xl hover:shadow-black/20"
            >
              <Quote className="w-8 h-8 text-[#f97316]/20 mb-4" />
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-4 h-4 ${
                      j < t.rating
                        ? 'fill-[#f97316] text-[#f97316]'
                        : 'text-[#27272a]'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-[#a1a1aa] leading-relaxed mb-4">
                "{t.text}"
              </p>
              <p className="text-sm font-semibold text-white">{t.name}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
