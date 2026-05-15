import { NextResponse } from 'next/server'
import { getCurrentUser, getSessionByToken, upsertSession } from '@/lib/auth'
import { query } from '@/lib/db'
import { getAuthCookieOptions } from '@/lib/sessionCookie'
import { getTokenFromRequest } from '@/lib/getToken'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const authToken = getTokenFromRequest()
    if (authToken) {
      await query(`DELETE FROM sessions WHERE user_id = ? AND expires_at <= NOW()`, [user.id])
      let session = await getSessionByToken(authToken)
      if (!session) {
        await upsertSession({ userId: user.id, token: authToken })
        session = await getSessionByToken(authToken)
      }
      if (!session) {
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
