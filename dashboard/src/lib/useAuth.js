"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AUTH_TOKEN_STORAGE_KEY } from './getToken'

const AuthContext = createContext(null)

function authHeaders(extra = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) : null
  const headers = { ...extra }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export function authFetch(input, init = {}) {
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers: authHeaders(init.headers || {})
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [servers, setServers] = useState([])
  const [currentServer, setCurrentServer] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const originalFetch = window.fetch.bind(window)
    window.fetch = (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url
      if (typeof url === 'string' && url.startsWith('/api')) {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
        const headers = new Headers(init.headers || {})
        if (token && !headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        init = { ...init, credentials: 'include', headers }
      }
      return originalFetch(input, init)
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkAuth() {
    try {
      const res = await authFetch('/api/auth/me')
      const data = await res.json()

      if (data.user) {
        setUser(data.user)
        setServers(data.servers || [])

        if (data.servers?.length > 0 && !currentServer) {
          const savedServer = localStorage.getItem('currentServerId')
          const server = savedServer
            ? data.servers.find(s => s.id === parseInt(savedServer))
            : data.servers[0]
          setCurrentServer(server || data.servers[0])
        }
      } else {
        setUser(null)
        setServers([])
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  function selectServer(server) {
    setCurrentServer(server)
    localStorage.setItem('currentServerId', server.id.toString())
  }

  async function logout() {
    await authFetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    setUser(null)
    setServers([])
    setCurrentServer(null)
    localStorage.removeItem('currentServerId')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{
      user,
      servers,
      currentServer,
      selectServer,
      loading,
      logout,
      refresh: checkAuth,
      authFetch
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
