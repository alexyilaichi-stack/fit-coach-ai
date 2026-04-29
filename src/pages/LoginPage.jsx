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
        // Auto-confirmed — logged in immediately, AppLayout will redirect to onboarding
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">💪</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FitCoach AI</h1>
          <p className="text-gray-400 mt-2 text-sm">Your AI-powered fitness coach</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-6">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 transition-shadow"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600 transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                <p className="text-sm text-green-400">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors mt-2"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center">
            <button
              onClick={() => { setIsSignUp(s => !s); setError(''); setMessage('') }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
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
