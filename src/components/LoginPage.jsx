import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, ArrowLeft, Loader2 } from 'lucide-react'
import OtpVerification from './OtpVerification'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ onLogin, onBack }) {
  const [mode, setMode] = useState(null) // null | 'phone' | 'email' | 'otp'
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [channel, setChannel] = useState('sms')
  const { login } = useAuth()

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

  const handleGoogleLogin = () => {
    const mockUser = { id: 'google-mock-id', name: 'Google User', email: 'user@gmail.com', auth_provider: 'google' }
    login(mockUser, 'mock-google-token')
    onLogin(mockUser)
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
              <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-center">
                  <h1 className="text-xl font-bold text-white">Sign In</h1>
                  <p className="text-sm text-[#a1a1aa] mt-1">Choose how to log in</p>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#27272a] bg-[#09090b] hover:bg-[#202024] text-white text-sm font-medium transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#27272a]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#18181b] px-2 text-[#71717a]">or</span>
                  </div>
                </div>

                <div className="space-y-2">
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
                </div>

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
