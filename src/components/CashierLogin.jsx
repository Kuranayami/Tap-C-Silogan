import { useState } from 'react'
import { ChefHat, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function CashierLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/cashier/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Invalid credentials')
        return
      }
      const { token, cashier } = await res.json()
      localStorage.setItem('cashier_token', token)
      if (cashier) localStorage.setItem('cashier_profile', JSON.stringify(cashier))
      onLogin()
    } catch {
      setError('Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBDA] text-[#4A3728] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => { window.location.hash = '' }}
          className="mb-8 p-2 rounded-xl border border-[#FFEC9E] text-[#4A3728] hover:text-[#D48040] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D48040] to-[#4A3728] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#D48040]/20">
            <ChefHat className="w-7 h-7 text-[#4A3728]" />
          </div>
          <h1 className="text-2xl font-bold">Cashier Login</h1>
          <p className="text-sm text-[#4A3728] mt-1">Order Management Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D48040]" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 transition-colors"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D48040]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D48040] hover:text-[#4A3728] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-[#D48040] text-center mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  )
}


