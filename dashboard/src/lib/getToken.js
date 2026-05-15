import { cookies, headers } from 'next/headers'

/** Server-only: read JWT from cookie or Authorization header. */
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
