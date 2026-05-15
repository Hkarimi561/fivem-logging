"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/lib/useAuth'
import { AUTH_TOKEN_STORAGE_KEY } from '@/lib/authConstants'

function LoginContent() {
  const { user, loading, refresh } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      if (data.token) {
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
      }

      await refresh()
      router.push('/')
    } catch {
      setError('Login failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const errorMessages = {
    invalid_credentials: 'Invalid username or password',
    auth_failed: 'Authentication failed. Please try again.'
  }

  const displayError = error || (queryError ? errorMessages[queryError] || queryError : '')

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />

      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 backdrop-blur relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 mb-4 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-white">FiveM Logs</CardTitle>
          <CardDescription className="text-zinc-400">
            Sign in with your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {displayError}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Username</label>
              <Input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="bg-zinc-900 border-zinc-700"
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="text-white">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}