import { useState } from 'react'
import { Bike, Loader2, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function RiderLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/rider/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('rider_token', data.token)
      localStorage.setItem('rider_profile', JSON.stringify(data.rider))
      onLogin(data.rider)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#37353E] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#44444E] bg-[#44444E] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Bike className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-[#D3DAD9]">Rider Login</h1>
            <p className="text-sm text-[#D3DAD9]/80 mt-1">Sign in to start delivering</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#D3DAD9]/60 mb-1.5 block">Phone Number</label>
              <input
                type="tel" placeholder="09123456789" value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#37353E] border border-[#44444E] text-[#D3DAD9] text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#D3DAD9]/60 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#37353E] border border-[#44444E] text-[#D3DAD9] text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D3DAD9]/60 hover:text-[#D3DAD9]/80 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[#D3DAD9] font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
