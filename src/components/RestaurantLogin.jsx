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
    <div className="min-h-screen bg-[#FFFBDA] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#FFEC9E] bg-[#FFFBDA] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#D48040]/20 flex items-center justify-center mx-auto mb-3">
              <ChefHat className="w-6 h-6 text-[#D48040]" />
            </div>
            <h1 className="text-xl font-bold text-[#4A3728]">Restaurant Login</h1>
            <p className="text-sm text-[#4A3728] mt-1">Mark orders as ready for delivery</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-[#4A3728]/60 mb-1.5 block">Username</label>
              <input
                type="text" placeholder="restaurant" value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-[#4A3728]/60 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="********" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-[#FFFBDA] border border-[#FFEC9E] text-[#4A3728] text-sm placeholder-[#4A3728]/50 focus:outline-none focus:border-[#FFBB70]/50 transition-colors"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D48040] hover:text-[#4A3728] transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button type="submit" disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-xl bg-[#D48040] hover:bg-[#FFBB70] text-[#FFFBDA] font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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

