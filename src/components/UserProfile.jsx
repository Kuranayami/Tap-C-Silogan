import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, Camera, Save, Loader2, ArrowLeft, Calendar1, Home } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api, imageUrl } from '../api'

export default function UserProfile({ onBack }) {
  const { user, token, updateUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [age, setAge] = useState(user?.age || '')
  const [gender, setGender] = useState(user?.gender || '')
  const [mapsLink, setMapsLink] = useState(user?.maps_link || '')
  const [address, setAddress] = useState(user?.address || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(api('/api/auth/profile'), { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() })
      .then(d => {
        updateUser({
          name: d.name, phone: d.phone, avatar_url: d.avatar_url,
          age: d.age, gender: d.gender, maps_link: d.maps_link, address: d.address,
        })
        setName(d.name || '')
        setPhone(d.phone || '')
        setAge(d.age ?? '')
        setGender(d.gender || '')
        setMapsLink(d.maps_link || '')
        setAddress(d.address || '')
        if (d.avatar_url) setAvatarPreview(imageUrl(d.avatar_url))
      })
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (user?.avatar_url) setAvatarPreview(imageUrl(user.avatar_url))
  }, [user?.avatar_url])

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
      fd.append('address', address || '')
      if (avatarFile) fd.append('avatar', avatarFile)

      const res = await fetch(api('/api/auth/profile'), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        if (d.needs_otp) {
          setError('Name change requires OTP verification. Please try again later.')
          return
        }
        throw new Error(d.error || 'Failed to save')
      }

      const data = await res.json()
      updateUser({
        name: data.name,
        phone: data.phone,
        avatar_url: data.avatar_url,
        age: data.age,
        gender: data.gender,
        maps_link: data.maps_link,
        address: data.address,
      })
      setPhone(data.phone || '')
      setMapsLink(data.maps_link || '')
      setAddress(data.address || '')
      setAvatarFile(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBDA]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 rounded-xl border border-[#FFEC9E] text-[#D48040] hover:text-[#FFBB70] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-[#D48040]">My Profile</h1>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave}
          className="space-y-6"
        >
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#FFEC9E] bg-[#FFEC9E]/30 mb-3 group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-[#D48040]/40" />
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-6 h-6 text-white" />
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-[#D48040]/60">Tap to change photo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D48040] mb-1.5">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#D48040]/40 focus:outline-none focus:border-[#FFBB70] transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D48040] mb-1.5">Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#D48040]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#D48040]/40 focus:outline-none focus:border-[#FFBB70] transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#D48040] mb-1.5">Age</label>
              <div className="relative">
                <Calendar1 className="w-4 h-4 text-[#D48040]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="number" min="1" max="120" value={age} onChange={e => setAge(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#D48040]/40 focus:outline-none focus:border-[#FFBB70] transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#D48040] mb-1.5">Gender</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#D48040]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <select value={gender} onChange={e => setGender(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm focus:outline-none focus:border-[#FFBB70] transition-colors appearance-none">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer Not To Say</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D48040] mb-1.5">House/Street</label>
            <div className="relative">
              <Home className="w-4 h-4 text-[#D48040]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="123 Main St, Barangay..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#D48040]/40 focus:outline-none focus:border-[#FFBB70] transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#D48040] mb-1.5">Google Maps Link</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#D48040]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="url" value={mapsLink} onChange={e => setMapsLink(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#D48040]/40 focus:outline-none focus:border-[#FFBB70] transition-colors" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full px-6 py-3 rounded-xl bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Profile</>}
          </button>

          {saved && (
            <p className="text-emerald-600 text-sm text-center font-medium">Profile saved successfully!</p>
          )}
        </motion.form>
      </div>
    </div>
  )
}
