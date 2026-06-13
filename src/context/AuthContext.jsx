import { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const p = localStorage.getItem('user_profile')
      return p ? JSON.parse(p) : null
    } catch { return null }
  })

  const [token, setToken] = useState(() => localStorage.getItem('user_token'))

  const login = useCallback((userData, userToken) => {
    setUser(userData)
    setToken(userToken)
    localStorage.setItem('user_token', userToken)
    localStorage.setItem('user_profile', JSON.stringify(userData))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user_token')
    localStorage.removeItem('user_profile')
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates }
      localStorage.setItem('user_profile', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
