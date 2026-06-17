import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

const DIGIT_COUNT = 6
const COUNTDOWN_SEC = 60

export default function OtpVerification({ identifier, channel, devCode, onVerify, onResend, onBack }) {
  const [digits, setDigits] = useState(Array(DIGIT_COUNT).fill(''))
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (countdown <= 0) return
    const id = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const handleChange = useCallback((index, value) => {
    if (!/^\d?$/.test(value)) return
    setError('')
    const next = [...digits]
    next[index] = value
    setDigits(next)
    if (value && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }, [digits])

  const handleKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }, [digits])

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, DIGIT_COUNT)
    if (!text) return
    setError('')
    const next = Array(DIGIT_COUNT).fill('')
    for (let i = 0; i < text.length; i++) next[i] = text[i]
    setDigits(next)
    const focusIdx = Math.min(text.length, DIGIT_COUNT - 1)
    inputRefs.current[focusIdx]?.focus()
  }, [])

  const handleSubmit = async () => {
    const code = digits.join('')
    if (code.length !== DIGIT_COUNT) {
      setError('Please enter all 6 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onVerify(code)
    } catch (err) {
      setError(err.message || 'Verification failed')
      setDigits(Array(DIGIT_COUNT).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setCountdown(COUNTDOWN_SEC)
    setDigits(Array(DIGIT_COUNT).fill(''))
    setError('')
    inputRefs.current[0]?.focus()
    try { await onResend() } catch {}
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <p className="text-sm text-[#a1a1aa]">
          Enter the {DIGIT_COUNT}-digit code sent to
        </p>
        <p className="text-sm font-semibold text-white mt-1">{identifier}</p>
        <p className="text-[10px] text-[#71717a] mt-0.5">via {channel === 'sms' ? 'SMS' : 'Email'}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={el => (inputRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold bg-[#18181b] border border-[#27272a] rounded-xl text-white focus:border-[#f97316]/50 focus:outline-none focus:ring-1 focus:ring-[#f97316]/30 transition-all"
          />
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs text-center">{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading || digits.join('').length !== DIGIT_COUNT}
        className="w-full py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-sm transition-all disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>

      <div className="flex items-center justify-between text-xs">
        {countdown > 0 ? (
          <button
            onClick={onBack}
            className="text-[#71717a] hover:text-[#a1a1aa] transition-colors"
          >
            ← Change {channel === 'sms' ? 'number' : 'email'}
          </button>
        ) : (
          <div />
        )}
        <button
          onClick={handleResend}
          disabled={countdown > 0}
          className="text-[#f97316] hover:text-[#ea580c] transition-colors disabled:text-[#71717a] disabled:cursor-not-allowed"
        >
          {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
        </button>
      </div>
    </motion.div>
  )
}
