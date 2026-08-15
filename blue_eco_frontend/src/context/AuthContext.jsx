import { createContext, useContext, useState, useCallback } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.post('/login', { email, password })
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      const message =
        err.response?.data?.message || 'Could not sign in. Check your email and password.'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // Even if the server call fails (e.g. already-expired token),
      // still clear local state so the user isn't stuck logged in.
    }
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }
  return ctx
}
