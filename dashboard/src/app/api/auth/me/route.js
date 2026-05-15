import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser, getSessionByToken } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const cookieStore = cookies()
    const authToken = cookieStore.get('auth_token')?.value
    if (authToken) {
      await query(`DELETE FROM sessions WHERE user_id = ? AND expires_at <= NOW()`, [user.id])
      const session = await getSessionByToken(authToken)
      if (!session) {
        cookieStore.delete('auth_token')
        return NextResponse.json({ user: null }, { status: 401 })
      }
    }

    let servers = []
    if (Boolean(user.is_admin)) {
      servers = await query(`SELECT id, name, identifier FROM servers ORDER BY created_at DESC`)
    } else {
      servers = await query(
        `
        SELECT DISTINCT s.id, s.name, s.identifier
        FROM servers s
        LEFT JOIN user_server_access usa ON usa.server_id = s.id AND usa.user_id = ?
        LEFT JOIN server_admins sa ON sa.server_id = s.id AND sa.user_id = ?
        WHERE usa.user_id IS NOT NULL OR sa.user_id IS NOT NULL
        ORDER BY s.created_at DESC
        `,
        [user.id, user.id]
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        isAdmin: Boolean(user.is_admin)
      },
      servers: servers.map(s => ({
        id: s.id,
        name: s.name,
        identifier: s.identifier
      }))
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
