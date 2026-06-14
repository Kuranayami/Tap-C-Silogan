import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, ArrowLeft, Loader2 } from 'lucide-react'
import OtpVerification from './OtpVerification'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState(null)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState('sms')
  const googleBtnRef = useRef(null)
  const { login } = useAuth()

  const handleGoogleCredential = async (credential) => {
    const payload = JSON.parse(atob(credential.split('.')[1]))
    const { sub: google_id, email, name, picture: avatar_url } = payload
    try {
      const res = await fetch(api('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ google_id, email, name, avatar_url }),
      })
      const data = await res.json()
      if (res.ok && data.user) {
        login(data.user, data.token)
        onLogin(data.user)
      }
    } catch (err) {
      setError('Google login failed')
    }
  }

  useEffect(() => {
    if (!window.google || !googleBtnRef.current) return
    google.accounts.id.initialize({
      client_id: '604680540043-cg8i196rr9a40sgi3ut9f08cm82cs011.apps.googleusercontent.com',
      callback: (response) => handleGoogleCredential(response.credential),
    })
    google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      shape: 'pill',
      theme: 'outline',
      text: 'signin_with',
      size: 'large',
      width: '100%',
    })
  }, [])

  const handleSendOtp = async (type) => {
    setError('')
    setLoading(true)
    try {
      const body = type === 'phone'
        ? { phone: `63${phone.replace(/\D/g, '').replace(/^0?63?/, '')}`, channel: 'sms' }
        : { email, channel: 'email' }

      setIdentifier(body.phone || body.email)
      setChannel(type === 'phone' ? 'sms' : 'email')

      const res = await fetch(api('/api/auth/otp/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')

      setMode('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (code) => {
    const res = await fetch(api('/api/auth/otp/verify'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: identifier.includes('@') ? undefined : identifier,
        email: identifier.includes('@') ? identifier : undefined,
        otp_code: code,
        purpose: 'login',
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Verification failed')
    }

    const data = await res.json()
    if (data.user) login(data.user, data.token)
    onLogin(data.user)
  }

  const clearError = () => setError('')

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {mode === 'otp' ? (
              <OtpVerification
                key="otp"
                identifier={identifier}
                channel={channel}
                onVerify={handleVerifyOtp}
                onResend={() => handleSendOtp(channel === 'sms' ? 'phone' : 'email')}
                onBack={() => setMode(null)}
              />
            ) : mode === 'phone' ? (
              <motion.div key="phone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setMode(null)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">Phone Login</h2>
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">Phone Number</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] focus-within:border-[#f97316]/50 transition-colors">
                    <span className="text-[#71717a] text-sm shrink-0">+63</span>
                    <input
                      type="tel"
                      placeholder="9123456789"
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); clearError() }}
                      maxLength={10}
                      className="flex-1 bg-transparent text-white text-sm placeholder-[#71717a] focus:outline-none"
                    />
                  </div>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={() => handleSendOtp('phone')}
                  disabled={loading || phone.length < 9}
                  className="w-full py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send OTP via SMS
                </button>
              </motion.div>
            ) : mode === 'email' ? (
              <motion.div key="email" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setMode(null)} className="p-1.5 rounded-lg border border-[#27272a] text-[#a1a1aa] hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">Email Login</h2>
                </div>
                <div>
                  <label className="text-xs text-[#71717a] mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError() }}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                  />
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                <button
                  onClick={() => handleSendOtp('email')}
                  disabled={loading || !email.includes('@')}
                  className="w-full py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send OTP via Email
                </button>
              </motion.div>
            ) : (
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <div className="text-center mb-4">
                  <h1 className="text-xl font-bold text-white">Sign In</h1>
                  <p className="text-sm text-[#a1a1aa] mt-1">Choose how to log in</p>
                </div>

                <div ref={googleBtnRef} className="w-full flex justify-center"></div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#27272a]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#18181b] px-2 text-[#71717a]">or</span>
                  </div>
                </div>

                <button
                  onClick={() => setMode('phone')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#27272a] hover:bg-[#202024] text-white text-sm font-medium transition-all"
                >
                  <Phone className="w-4 h-4 text-[#f97316]" />
                  Continue with Phone
                </button>
                <button
                  onClick={() => setMode('email')}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#27272a] hover:bg-[#202024] text-white text-sm font-medium transition-all"
                >
                  <Mail className="w-4 h-4 text-[#f97316]" />
                  Continue with Email
                </button>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                {onBack && (
                  <button onClick={onBack} className="w-full text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors">
                    ← Back
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
