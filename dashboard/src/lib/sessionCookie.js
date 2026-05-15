/** Cookie options for auth_token. Secure only when explicitly enabled (HTTP Docker/VPS needs false). */
export function getAuthCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
    maxAge: maxAgeSeconds,
    path: '/'
  }
}
