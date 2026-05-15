import { cookies, headers } from 'next/headers'

/** Read JWT from cookie or Authorization header (Route Handlers / Server Components). */
export function getTokenFromRequest() {
  const cookieStore = cookies()
  const cookieToken = cookieStore.get('auth_token')?.value
  if (cookieToken) return cookieToken

  const authHeader = headers().get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  return null
}

export const AUTH_TOKEN_STORAGE_KEY = 'auth_token'
