import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BlueEcoMark from '../components/BlueEcoMark'
import SpirulinaScene from '../components/SpirulinaScene'

const REMEMBER_KEY = 'blueeco_remembered_email'
const REMEMBER_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showForgotNote, setShowForgotNote] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(REMEMBER_KEY)
    if (!raw) return

    try {
      const { email: savedEmail, expiresAt } = JSON.parse(raw)
      if (expiresAt && Date.now() < expiresAt) {
        setEmail(savedEmail)
        setRememberMe(true)
      } else {
        // Expired — clear it so it doesn't linger.
        localStorage.removeItem(REMEMBER_KEY)
      }
    } catch {
      // Malformed/old-format entry (e.g. from before this change) — discard it.
      localStorage.removeItem(REMEMBER_KEY)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await login(email, password)
      if (rememberMe) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ email, expiresAt: Date.now() + REMEMBER_DURATION_MS })
        )
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      navigate('/', { replace: true })
    } catch {
      // error state is already handled inside AuthContext
    }
  }

  return (
    <div className="min-h-screen bg-brand-100 flex font-['Plus_Jakarta_Sans']">
      {/* Floating form card */}
      <div className="relative z-10 flex w-full lg:w-[500px] shrink-0 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm rounded-[2rem] bg-canvas shadow-xl p-8 sm:p-10">
          <div className="flex justify-center">
            <BlueEcoMark />
          </div>

          <h1 className="mt-6 text-center text-3xl sm:text-4xl font-extrabold leading-tight text-ink">
            Welcome back!
          </h1>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error && (
              <div className="rounded-2xl border border-danger-500/30 bg-danger-500/10 px-4 py-2.5 text-sm text-red-600">
                {error}
              </div>
            )}

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-full border border-ink/10 bg-white px-5 py-3.5 text-sm text-ink placeholder:text-ink/40 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-full border border-ink/10 bg-white px-5 py-3.5 pr-12 text-sm text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center text-ink/40 hover:text-ink/70"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {showForgotNote && (
              <p className="rounded-2xl bg-brand-100 px-4 py-2.5 text-xs text-ink/60">
                Password resets aren't self-service yet — please contact your administrator
                directly to have your password reset.
              </p>
            )}

            <div className="flex items-center justify-between px-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/60">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-400"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => setShowForgotNote((v) => !v)}
                className="text-xs font-semibold text-brand-500 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-ink py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="text-center text-xs text-ink/60">
              Want to be a distributor?{' '}
              <Link to="/register" className="font-semibold text-brand-500 hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Illustration scene */}
      <div className="relative hidden flex-1 lg:block">
        <SpirulinaScene />
      </div>
    </div>
  )
}
