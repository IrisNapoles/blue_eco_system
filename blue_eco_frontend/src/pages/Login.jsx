import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import spirulinaPhoto from '../assets/spirulina.jpg'

export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch {
      // error state is already handled inside AuthContext
    }
  }

  return (
    <div className="min-h-screen bg-brand-700 flex overflow-hidden">
      {/* Left panel — wave-clipped brand surface, desktop only */}
      <div className="relative hidden md:block md:w-[52%] lg:w-[48%] shrink-0">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,0 H70 C95,15 95,35 70,50 C45,65 45,85 70,100 H0 Z"
            fill="#ffffff"
          />
        </svg>

        <div className="relative z-10 flex h-full flex-col justify-between p-8 lg:p-10">
          <div>
            <span className="font-display text-lg font-semibold tracking-tight text-brand-600">
              Blue Eco Farm
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center py-4">
            <div className="relative w-full max-w-[340px]">
              <div className="absolute inset-0 scale-110 bg-brand-100/70 blob-shape" />
              <div className="relative overflow-hidden blob-shape aspect-square">
                <img
                  src={spirulinaPhoto}
                  alt="Spirulina powder and tablets"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-ink-soft">
            <p>&copy; {new Date().getFullYear()} Blue Eco Farm.</p>
            <p>Grown, dried, and shipped with care.</p>
          </div>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Blue Eco Farm
            </span>
          </div>

          <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Log in
          </h1>
          <p className="mt-2 text-sm text-brand-100">
            Enter your details to access your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-md border border-danger-500/40 bg-danger-500/10 px-3 py-2 text-sm text-danger-50">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-brand-100">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-brand-400 focus:bg-white/15 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-100">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-brand-400 focus:bg-white/15 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand-400 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <p className="mt-8 text-xs text-brand-100/70">
            Don&apos;t have an account? Contact your administrator to get set up.
          </p>
        </div>
      </div>
    </div>
  )
}
