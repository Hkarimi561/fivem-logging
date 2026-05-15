import { NextResponse } from 'next/server'
import { getCurrentUser, createUser } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const like = `%${q}%`

    const users = await query(
      `SELECT id, username, display_name, is_admin, last_login, created_at
       FROM users
       WHERE (? = ''
              OR username LIKE ?
              OR display_name LIKE ?)
       ORDER BY created_at DESC
       LIMIT 50`,
      [q, like, like]
    )

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get all users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { username, password, displayName, isAdmin, serverIds } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const newUser = await createUser({
      username,
      password,
      displayName,
      isAdmin: Boolean(isAdmin),
      serverIds: Array.isArray(serverIds) ? serverIds : []
    })

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    if (error.message === 'Username already exists') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error.message?.includes('Password must be')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
