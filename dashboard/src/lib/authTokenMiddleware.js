/** Edge-safe: no next/headers imports. */
export function getTokenFromMiddleware(request) {
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) return cookieToken

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  return null
}
