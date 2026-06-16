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
    <div className="min-h-screen bg-[#091413] text-[#B0E4CC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => { window.location.hash = '' }}
          className="mb-8 p-2 rounded-xl border border-[#408A71] text-[#B0E4CC] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#408A71] to-[#B0E4CC] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#408A71]/20">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Cashier Login</h1>
          <p className="text-sm text-[#B0E4CC] mt-1">Order Management Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#408A71]" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#285A48] border border-[#408A71] text-white text-sm placeholder-[#408A71] focus:outline-none focus:border-[#B0E4CC]/50 transition-colors"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#408A71]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#285A48] border border-[#408A71] text-white text-sm placeholder-[#408A71] focus:outline-none focus:border-[#B0E4CC]/50 transition-colors"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#408A71] hover:text-[#B0E4CC] transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#408A71] hover:bg-[#285A48] text-white font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-[#408A71] text-center mt-6">
          Authorized personnel only
        </p>
      </div>
    </div>
  )
}
