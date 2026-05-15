import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  authenticateUser,
  bootstrapAdminIfNeeded,
  loginUser
} from '@/lib/auth'
import { queryOne } from '@/lib/db'

export async function POST(request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const bootstrap = await bootstrapAdminIfNeeded(username, password)
    if (bootstrap?.error === 'no_bootstrap') {
      const countRow = await queryOne('SELECT COUNT(*) AS count FROM users')
      if (countRow?.count === 0) {
        return NextResponse.json(
          { error: 'No users exist. Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD in environment.' },
          { status: 503 }
        )
      }
    }

    let user = await authenticateUser(username, password)

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 })
    }

    const token = await loginUser(user)
    const cookieStore = cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: Boolean(user.is_admin)
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
