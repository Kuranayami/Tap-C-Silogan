import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, Camera, Save, Loader2, ArrowLeft, Calendar1 } from 'lucide-react'
import { api, imageUrl } from '../api'

export default function CashierProfile({ onBack }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [mapsLink, setMapsLink] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const cashierHeaders = () => {
    const token = localStorage.getItem('cashier_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  useEffect(() => {
    fetch(api('/api/cashier/profile'), { headers: cashierHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setName(d.name || '')
          setUsername(d.username || '')
          setPhone(d.phone || '')
          setAge(d.age || '')
          setGender(d.gender || '')
          setMapsLink(d.maps_link || '')
          if (d.avatar_url) setAvatarPreview(imageUrl(d.avatar_url))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      if (name.trim()) fd.append('name', name.trim())
      if (phone.trim()) fd.append('phone', phone.trim())
      if (age !== '' && age !== undefined) fd.append('age', String(age))
      if (gender) fd.append('gender', gender)
      fd.append('maps_link', mapsLink || '')
      if (avatarFile) fd.append('avatar', avatarFile)

      const res = await fetch(api('/api/cashier/profile'), {
        method: 'PATCH',
        headers: cashierHeaders(),
        body: fd,
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save')
      }

      const data = await res.json()
      const profile = JSON.parse(localStorage.getItem('cashier_profile') || '{}')
      localStorage.setItem('cashier_profile', JSON.stringify({ ...profile, ...data }))
      setAvatarFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="w-8 h-8 animate-spin text-[#f97316]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">Cashier Profile</h1>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          className="space-y-6"
        >
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#27272a] bg-[#18181b] mb-3 group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-[#52525b]" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-[#71717a]">Tap to change photo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Username</label>
            <input type="text" value={username} disabled
              className="w-full px-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-[#71717a] text-sm cursor-not-allowed opacity-60" />
            <p className="text-[#52525b] text-xs mt-1">Username cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Age</label>
              <div className="relative">
                <Calendar1 className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Gender</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-[#f97316]/50 transition-colors appearance-none">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#a1a1aa] mb-1.5">Google Maps Link</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="url" value={mapsLink} onChange={e => setMapsLink(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full px-6 py-3 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>

          {saved && (
            <p className="text-emerald-400 text-sm text-center font-medium">Profile saved successfully!</p>
          )}
        </motion.form>
      </div>
    </div>
  )
}
