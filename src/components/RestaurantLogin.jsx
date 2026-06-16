import { useState } from 'react'
import { ChefHat, Loader2, Eye, EyeOff } from 'lucide-react'
import { api } from '../api'

export default function RestaurantLogin({ onLogin }) {
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
      const res = await fetch(api('/api/restaurant/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('restaurant_token', data.token)
      localStorage.setItem('restaurant_profile', JSON.stringify(data.restaurant))
      onLogin(data.restaurant)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#091413] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#408A71] bg-[#285A48] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#408A71]/20 flex items-center justify-center mx-auto mb-3">
              <ChefHat className="w-6 h-6 text-[#408A71]" />
            </div>
            <h1 className="text-xl font-bold text-[#B0E4CC]">Restaurant Login</h1>
            <p className="text-sm text-[#B0E4CC] mt-1">Mark orders as ready for delivery</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#408A71] mb-1.5 block">Username</label>
              <input
                type="text" placeholder="restaurant" value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#091413] border border-[#408A71] text-white text-sm placeholder-[#408A71] focus:outline-none focus:border-[#B0E4CC]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#408A71] mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#091413] border border-[#408A71] text-white text-sm placeholder-[#408A71] focus:outline-none focus:border-[#B0E4CC]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#408A71] hover:text-[#B0E4CC] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-xl bg-[#408A71] hover:bg-[#285A48] text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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