import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { query } from '@/lib/db'
import { getAuthCookieOptions } from '@/lib/sessionCookie'

function clearAuthCookie(response) {
  response.cookies.set('auth_token', '', { ...getAuthCookieOptions(0), maxAge: 0 })
}

export async function POST() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (token) {
    await query(`DELETE FROM sessions WHERE token = ?`, [token])
  }

  const response = NextResponse.json({ success: true })
  clearAuthCookie(response)
  return response
}

export async function GET(request) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (token) {
    await query(`DELETE FROM sessions WHERE token = ?`, [token])
  }

  const response = NextResponse.redirect(new URL('/login', request.url))
  clearAuthCookie(response)
  return response
}
