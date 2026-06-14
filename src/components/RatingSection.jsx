import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Star, MessageCircle } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function RatingSection() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState([])
  const [average, setAverage] = useState(0)
  const [count, setCount] = useState(0)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [hover, setHover] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(api('/api/config/ratings')).then(r => r.ok ? r.json() : {}).then(d => {
      if (d.ratings) { setRatings(d.ratings); setAverage(d.average); setCount(d.count) }
    }).catch(() => {})
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?.name || !rating) return
    setSubmitting(true)
    try {
      const res = await fetch(api('/api/config/ratings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, rating, comment }),
      })
      if (res.ok) {
        setSubmitted(true)
        setRating(0); setComment('')
        const d = await res.json()
        setRatings(prev => [d, ...prev])
        const all = [d, ...ratings]
        setAverage(Math.round(all.reduce((s, r) => s + r.rating, 0) / all.length * 10) / 10)
        setCount(all.length)
        setTimeout(() => setSubmitted(false), 3000)
      }
    } catch {} finally { setSubmitting(false) }
  }

  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20 text-[#f97316] text-xs sm:text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-[#f97316]" />
            Rate Us
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            What{' '}
            <span className="bg-gradient-to-r from-[#f97316] to-[#f59e0b] bg-clip-text text-transparent">You</span>{' '}
            Say Matters
          </h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 sm:p-8 mb-8">
          {submitted ? (
            <div className="text-center py-6">
              <Star className="w-12 h-12 text-[#f97316] fill-[#f97316] mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Thank you for your rating!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
                    className="p-1 transition-all"
                  >
                    <Star className={`w-8 h-8 transition-colors ${n <= (hover || rating) ? 'fill-[#f97316] text-[#f97316]' : 'text-[#27272a]'}`} />
                  </button>
                ))}
              </div>
              {user ? (
                <>
                  <div className="px-4 py-2.5 rounded-xl bg-[#202024] border border-[#27272a] text-white text-sm opacity-60">
                    {user.name}
                  </div>
                  <input type="hidden" name="name" value={user.name} />
                </>
              ) : (
                <a href="#/login" className="block w-full text-center px-4 py-2.5 rounded-xl bg-[#202024] border border-[#27272a] text-[#f97316] text-sm hover:border-[#f97316]/50 transition-colors">
                  Sign in to leave a rating
                </a>
              )}
              <textarea placeholder="Comment (optional)" value={comment} onChange={e => setComment(e.target.value)} rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-[#202024] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors" />
              <button type="submit" disabled={!user || !rating || submitting}
                className="w-full px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all disabled:opacity-50 active:scale-[0.98]">
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          )}
        </motion.div>

        {count > 0 && (
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={`w-5 h-5 ${n <= Math.round(average) ? 'fill-[#f97316] text-[#f97316]' : 'text-[#27272a]'}`} />
              ))}
            </div>
            <p className="text-2xl font-bold text-white">{average} <span className="text-sm text-[#a1a1aa] font-normal">({count} review{count !== 1 ? 's' : ''})</span></p>
          </motion.div>
        )}

        <div className="space-y-3">
          {ratings.slice(0, 10).map((item, i) => (
            <motion.div key={item.id || i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#f97316]/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-[#f97316]">{item.name[0]}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{item.name}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= item.rating ? 'fill-[#f97316] text-[#f97316]' : 'text-[#27272a]'}`} />
                  ))}
                </div>
              </div>
              {item.comment && <p className="text-sm text-[#a1a1aa]">{item.comment}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
