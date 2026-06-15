import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, Check, Upload, Bike, Car, Smartphone,
  User, Mail, Phone, Camera, AlertCircle, ArrowLeft, Loader2, Lock, Eye, EyeOff,
} from 'lucide-react'
import { api } from '../api'

const STEPS = [
  { num: 1, label: 'Personal Info', icon: User },
  { num: 2, label: 'Verification', icon: Smartphone },
  { num: 3, label: 'Vehicle & Photo', icon: Bike },
]

const VEHICLES = [
  { id: 'bicycle', label: 'Bicycle', icon: Bike, desc: 'Eco-friendly & agile' },
  { id: 'motorcycle', label: 'Motorcycle', icon: Bike, desc: 'Fast & maneuverable' },
  { id: 'car', label: 'Car', icon: Car, desc: 'Spacious & secure' },
]

const COUNTRY_CODES = [
  { code: '+63', country: 'PH', flag: '🇵🇭' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+81', country: 'JP', flag: '🇯🇵' },
  { code: '+86', country: 'CN', flag: '🇨🇳' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
]

export default function RiderRegistration({ onComplete, onBack }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', countryCode: '+63',
  })
  const [vehicle, setVehicle] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [profileFile, setProfileFile] = useState(null)
  const [profilePreview, setProfilePreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // OTP state
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''))
  const [countdown, setCountdown] = useState(60)
  const [otpSent, setOtpSent] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpSending, setOtpSending] = useState(false)

  const otpRefs = useRef([])
  const fileInputRef = useRef(null)

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // ── OTP countdown ──
  useEffect(() => {
    if (!otpSent || countdown <= 0) return
    const id = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [otpSent, countdown])

  useEffect(() => {
    if (step === 2) otpRefs.current[0]?.focus()
  }, [step])

  // ── Validation ──
  const validate = useCallback((s) => {
    const errs = {}
    if (s === 1 || !s) {
      if (!form.name.trim()) errs.name = 'Full name is required'
      else if (form.name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
      if (!form.email.trim()) errs.email = 'Email is required'
      else if (!emailRegex.test(form.email.trim())) errs.email = 'Enter a valid email address (e.g., name@domain.com)'
      if (!form.phone.trim()) errs.phone = 'Phone number is required'
      else if (form.phone.replace(/\D/g, '').length < 7) errs.phone = 'Enter at least 7 digits'
      if (!form.password) errs.password = 'Password is required'
      else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    }
    if (s === 3) {
      if (!vehicle) errs.vehicle = 'Select a vehicle type'
      if ((vehicle === 'motorcycle' || vehicle === 'car') && !licensePlate.trim()) {
        errs.licensePlate = 'License plate is required'
      }
    }
    return errs
  }, [form, vehicle, licensePlate, emailRegex])

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const errs = validate(step)
    setErrors(prev => ({ ...prev, [field]: errs[field] || '' }))
  }

  const fieldError = (field) => touched[field] ? errors[field] : ''

  // ── Step navigation ──
  const canProceedTo2 = form.name.trim().length >= 2 &&
    form.email.trim().length >= 5 && form.email.includes('@') &&
    form.phone.replace(/\D/g, '').length >= 7 &&
    form.password.length >= 6

  const canProceedTo3 = otpVerified

  const goToStep2 = async () => {
    const errs = validate(1)
    setErrors(errs)
    setTouched({ name: true, email: true, phone: true })
    if (Object.keys(errs).length > 0) return
    setOtpSending(true)
    setOtpError('')
    try {
      const res = await fetch(api('/api/auth/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), channel: 'email', purpose: 'register' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send code')
      setOtpSent(true)
      setCountdown(60)
      setStep(2)
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setOtpSending(false)
    }
  }

  const handleVerifyOtp = async () => {
    const code = otpDigits.join('')
    if (code.length !== 6) { setOtpError('Enter all 6 digits'); return }
    setOtpLoading(true)
    setOtpError('')
    try {
      const res = await fetch(api('/api/auth/otp/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), otp_code: code, purpose: 'register' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Verification failed')
      setOtpVerified(true)
      setStep(3)
    } catch (err) {
      setOtpError(err.message)
      setOtpDigits(Array(6).fill(''))
      otpRefs.current[0]?.focus()
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResend = async () => {
    setCountdown(60)
    setOtpDigits(Array(6).fill(''))
    setOtpError('')
    otpRefs.current[0]?.focus()
    try {
      await fetch(api('/api/auth/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim().toLowerCase(), channel: 'email', purpose: 'register' }),
      })
    } catch {}
  }

  const goToStep1 = () => setStep(1)
  const goBack = () => { if (step === 1) onBack?.(); else setStep(step - 1) }

  // ── Profile photo ──
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setProfileFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setProfilePreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  // ── OTP handlers ──
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return
    setOtpError('')
    const next = [...otpDigits]; next[index] = value; setOtpDigits(next)
    if (value && index < 5) otpRefs.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0)
      otpRefs.current[index - 1]?.focus()
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    const next = Array(6).fill('')
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setOtpDigits(next)
    otpRefs.current[Math.min(text.length, 5)]?.focus()
  }

  // ── Final submit ──
  const handleSubmit = async () => {
    const errs = validate(3)
    setErrors(errs)
    setTouched(prev => ({ ...prev, vehicle: true, licensePlate: true }))
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    setOtpError('')
    try {
      const fd = new FormData()
      fd.append('name', form.name.trim())
      fd.append('phone', form.countryCode + form.phone.replace(/\D/g, ''))
      fd.append('email', form.email.trim().toLowerCase())
      fd.append('password', form.password)
      fd.append('vehicle_type', vehicle)
      if (licensePlate.trim()) fd.append('license_plate', licensePlate.trim())
      if (profileFile) fd.append('avatar', profileFile)

      const res = await fetch(api('/api/rider/register'), {
        method: 'POST',
        body: fd,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Registration failed')
      }

      const data = await res.json()
      localStorage.setItem('rider_token', data.token)
      localStorage.setItem('rider_profile', JSON.stringify(data.rider))
      setDone(true)
      setTimeout(() => onComplete?.(data.rider), 1500)
    } catch (err) {
      setOtpError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Progress bar ──
  const progressPct = ((step - 1) / 2) * 100

  // ── Render ──
  if (done) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Account Created!</h2>
          <p className="text-sm text-[#a1a1aa]">Welcome to the rider team, {form.name.split(' ')[0]}!</p>
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 sm:p-8">
          {/* ── Back button ── */}
          <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors mb-6">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          {/* ── Progress Bar ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              {STEPS.map((s, i) => (
                <div key={s.num} className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 ${step >= s.num ? 'text-emerald-400' : 'text-[#71717a]'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      step > s.num ? 'bg-emerald-500/20 text-emerald-400' :
                      step === s.num ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                      'bg-[#202024] text-[#71717a]'
                    }`}>
                      {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:inline ${step >= s.num ? 'text-emerald-400' : 'text-[#71717a]'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-8 sm:w-12 h-0.5 rounded ${step > s.num ? 'bg-emerald-500' : 'bg-[#27272a]'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="w-full h-1 rounded-full bg-[#27272a] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ══════ STEP 1: Personal Info ══════ */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-white">Personal Information</h2>
                  <p className="text-xs text-[#71717a] mt-1">Tell us about yourself</p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" /> Full Name
                  </label>
                  <input
                    type="text" placeholder="Juan Dela Cruz"
                    value={form.name}
                    onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(prev => ({ ...prev, name: '' })) }}
                    onBlur={() => handleBlur('name')}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#09090b] border text-sm text-white placeholder-[#71717a] focus:outline-none transition-all ${
                      fieldError('name') ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :
                      'border-[#27272a] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30'
                    }`}
                  />
                  {fieldError('name') && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-400" /> Email Address
                  </label>
                  <input
                    type="email" placeholder="juan@example.com"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(prev => ({ ...prev, email: '' })) }}
                    onBlur={() => handleBlur('email')}
                    className={`w-full px-4 py-2.5 rounded-xl bg-[#09090b] border text-sm text-white placeholder-[#71717a] focus:outline-none transition-all ${
                      fieldError('email') ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :
                      'border-[#27272a] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30'
                    }`}
                  />
                  {fieldError('email') && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters"
                      value={form.password}
                      onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(prev => ({ ...prev, password: '' })) }}
                      onBlur={() => handleBlur('password')}
                      className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-[#09090b] border text-sm text-white placeholder-[#71717a] focus:outline-none transition-all ${
                        fieldError('password') ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :
                        'border-[#27272a] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#a1a1aa] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldError('password') && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
                </div>

                {/* Phone with country code */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" /> Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={form.countryCode}
                      onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}
                      className="px-2 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <div className="flex-1 relative">
                      <input
                        type="tel" placeholder="9123456789"
                        value={form.phone}
                        onChange={e => { setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') })); setErrors(prev => ({ ...prev, phone: '' })) }}
                        onBlur={() => handleBlur('phone')}
                        className={`w-full px-4 py-2.5 rounded-xl bg-[#09090b] border text-sm text-white placeholder-[#71717a] focus:outline-none transition-all ${
                          fieldError('phone') ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :
                          'border-[#27272a] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      />
                    </div>
                  </div>
                  {fieldError('phone') && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
                </div>

                <button
                  onClick={goToStep2}
                  disabled={!canProceedTo2}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* ══════ STEP 2: OTP Verification ══════ */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <Smartphone className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Verify Your {form.email ? 'Email' : 'Phone'}</h2>
                  <p className="text-xs text-[#a1a1aa] mt-1">
                    Enter the 6-digit code sent to
                  </p>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5">{form.email || `${form.countryCode} ${form.phone}`}</p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((d, i) => (
                    <input
                      key={i}
                      ref={el => (otpRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={1}
                      value={d}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold bg-[#09090b] border border-[#27272a] rounded-xl text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    />
                  ))}
                </div>

                {otpError && <p className="text-red-400 text-xs text-center">{otpError}</p>}

                <div className="flex items-center justify-between text-xs">
                  <button onClick={goToStep1} className="text-[#71717a] hover:text-[#a1a1aa] transition-colors">
                    ← Change {form.email ? 'email' : 'number'}
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className="text-emerald-400 hover:text-emerald-300 transition-colors disabled:text-[#71717a] disabled:cursor-not-allowed"
                  >
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>

                {otpSending && (
                  <p className="text-center text-xs text-[#a1a1aa]">Sending verification code...</p>
                )}
                <button
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || otpDigits.join('').length !== 6}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {otpLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Continue'}
                  {!otpLoading && <ChevronRight className="w-4 h-4" />}
                </button>
              </motion.div>
            )}

            {/* ══════ STEP 3: Vehicle & Photo ══════ */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div className="text-center mb-2">
                  <h2 className="text-lg font-bold text-white">Vehicle & Profile Photo</h2>
                  <p className="text-xs text-[#71717a] mt-1">Almost there! Tell us your ride.</p>
                </div>

                {/* Vehicle selection grid */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-2 flex items-center gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-emerald-400" /> Vehicle Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {VEHICLES.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setVehicle(v.id); setErrors(prev => ({ ...prev, vehicle: '' })) }}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          vehicle === v.id
                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                            : 'bg-[#09090b] border-[#27272a] hover:border-[#a1a1aa]/30'
                        }`}
                      >
                        <v.icon className={`w-5 h-5 mx-auto mb-1 ${vehicle === v.id ? 'text-emerald-400' : 'text-[#71717a]'}`} />
                        <p className={`text-xs font-medium ${vehicle === v.id ? 'text-emerald-400' : 'text-[#a1a1aa]'}`}>{v.label}</p>
                        <p className="text-[10px] text-[#71717a] mt-0.5 hidden sm:block">{v.desc}</p>
                      </button>
                    ))}
                  </div>
                  {errors.vehicle && <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.vehicle}</p>}
                </div>

                {/* Conditional: License Plate */}
                <AnimatePresence>
                  {(vehicle === 'motorcycle' || vehicle === 'car') && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="text-xs text-[#a1a1aa] mb-1.5 block">License Plate / Vehicle ID</label>
                      <input
                        type="text" placeholder="ABC-1234"
                        value={licensePlate}
                        onChange={e => { setLicensePlate(e.target.value); setErrors(prev => ({ ...prev, licensePlate: '' })) }}
                        onBlur={() => handleBlur('licensePlate')}
                        className={`w-full px-4 py-2.5 rounded-xl bg-[#09090b] border text-sm text-white placeholder-[#71717a] focus:outline-none transition-all ${
                          fieldError('licensePlate') ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30' :
                          'border-[#27272a] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30'
                        }`}
                      />
                      {fieldError('licensePlate') && <p className="text-red-400 text-[10px] mt-1">{errors.licensePlate}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Profile photo upload */}
                <div>
                  <label className="text-xs text-[#a1a1aa] mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" /> Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-16 h-16 rounded-xl border-2 border-dashed border-[#27272a] bg-[#09090b] flex items-center justify-center cursor-pointer hover:border-emerald-500/30 transition-all overflow-hidden"
                    >
                      {profilePreview ? (
                        <img src={profilePreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-5 h-5 text-[#71717a]" />
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        {profileFile ? 'Change photo' : 'Upload photo'}
                      </button>
                      <p className="text-[10px] text-[#71717a] mt-0.5">JPG, PNG, WebP · Max 5MB</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={goToStep1} className="flex-1 py-2.5 rounded-xl border border-[#27272a] text-[#a1a1aa] hover:text-white text-sm font-medium transition-all">
                    <ChevronLeft className="w-4 h-4 inline mr-1" /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !vehicle}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Account'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
