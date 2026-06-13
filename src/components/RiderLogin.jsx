import { useState } from 'react'
import { Bike, Loader2, UserPlus } from 'lucide-react'
import { api } from '../api'

export default function RiderLogin({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
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

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!name || !phone || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(api('/api/rider/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
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
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Bike className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Rider Login' : 'Rider Registration'}
            </h1>
            <p className="text-sm text-[#a1a1aa] mt-1">
              {mode === 'login' ? 'Sign in to start delivering' : 'Create your rider account'}
            </p>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Phone Number</label>
                <input
                  type="tel" placeholder="09123456789" value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Password</label>
                <input
                  type="password" placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading || !username || !password}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sign In
              </button>
              <button type="button" onClick={() => { setMode('register'); setError('') }}
                className="w-full text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                No account? Register as rider
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Full Name</label>
                <input type="text" placeholder="Juan Dela Cruz" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Phone Number</label>
                <input type="tel" placeholder="09123456789" value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-[#71717a] mb-1.5 block">Password</label>
                <input type="password" placeholder="At least 6 characters" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-white text-sm placeholder-[#71717a] focus:outline-none focus:border-[#f97316]/50 transition-colors"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading || !name || !phone || password.length < 6}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <UserPlus className="w-4 h-4" /> Register
              </button>
              <button type="button" onClick={() => { setMode('login'); setError('') }}
                className="w-full text-xs text-[#71717a] hover:text-[#a1a1aa] transition-colors"
              >
                Already have an account? Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
