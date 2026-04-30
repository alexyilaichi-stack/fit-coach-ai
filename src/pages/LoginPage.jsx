import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    if (isSignUp) {
      const { data, error: signUpError } = await signUp(email, password)
      setLoading(false)
      if (signUpError) {
        setError(signUpError.message)
      } else if (data.session) {
        navigate('/app/training', { replace: true })
      } else {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error: signInError } = await signIn(email, password)
      setLoading(false)
      if (signInError) {
        setError(signInError.message)
      } else {
        navigate('/app/training', { replace: true })
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 mb-4 shadow-lg shadow-orange-200">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">FitCoach AI</h1>
          <p className="text-zinc-400 mt-1.5 text-sm">Your personal training companion</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900 mb-6">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-zinc-400 transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-zinc-400 transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-sm text-emerald-700">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all mt-2 shadow-sm shadow-orange-100"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-100 text-center">
            <button
              onClick={() => { setIsSignUp(s => !s); setError(''); setMessage('') }}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
