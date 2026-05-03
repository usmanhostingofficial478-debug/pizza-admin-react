'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ADMIN_PASSWORD, setLoggedIn, isAuthenticated } from '@/lib/auth'

export default function LoginPage() {
  const router  = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [show, setShow]         = useState(false)

  useEffect(() => {
    if (isAuthenticated()) router.replace('/')
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        setLoggedIn()
        router.replace('/')
      } else {
        setError('Incorrect password. Please try again.')
        setLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#0a0a14' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-2xl"
            style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
            <span className="text-3xl">🍕</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Pizza Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 p-8 shadow-2xl" style={{ background: '#1a1a2e' }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-400 mb-2">Admin Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="Enter password..."
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500 transition pr-12"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition text-sm">
                  {show ? '🙈' : '👁'}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  ✗ {error}
                </p>
              )}
            </div>

            <button type="submit" disabled={!password || loading}
              className="w-full py-3 rounded-xl font-bold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#ea580c,#f97316)' }}>
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          Session expires after 15 minutes of inactivity
        </p>
      </div>
    </div>
  )
}
