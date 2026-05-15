import { NextResponse } from 'next/server'
import { getCurrentUser, hashPassword, validatePassword } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    const targetUser = await queryOne(
      `SELECT id, username, display_name, is_admin, last_login, created_at
       FROM users WHERE id = ?`,
      [userId]
    )

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const viewerAccess = await query(
      `SELECT usa.server_id, s.name as server_name, s.identifier, 'viewer' as role
       FROM user_server_access usa
       JOIN servers s ON s.id = usa.server_id
       WHERE usa.user_id = ?`,
      [userId]
    )

    const adminAccess = await query(
      `SELECT sa.server_id, s.name as server_name, s.identifier, sa.permission_level as role
       FROM server_admins sa
       JOIN servers s ON s.id = sa.server_id
       WHERE sa.user_id = ?`,
      [userId]
    )

    const rank = { admin: 3, moderator: 2, viewer: 1 }
    const merged = {}
    for (const rec of [...viewerAccess, ...adminAccess]) {
      const key = rec.server_id
      const current = merged[key]
      if (!current || (rank[rec.role] || 0) > (rank[current.role] || 0)) {
        merged[key] = rec
      }
    }
    const serverAccess = Object.values(merged)

    return NextResponse.json({ user: targetUser, serverAccess })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { isAdmin, displayName, password } = body

    if (displayName !== undefined) {
      await query(`UPDATE users SET display_name = ? WHERE id = ?`, [displayName, userId])
    }

    if (isAdmin !== undefined) {
      await query(`UPDATE users SET is_admin = ? WHERE id = ?`, [isAdmin ? 1 : 0, userId])
    }

    if (password) {
      const passwordError = validatePassword(password)
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 })
      }
      const passwordHash = await hashPassword(password)
      await query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, userId])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params

    if (user.id === parseInt(userId)) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }

    await query(`DELETE FROM users WHERE id = ?`, [userId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const body = await request.json()
    const { serverId, action } = body

    if (action === 'grant') {
      await query(
        `INSERT IGNORE INTO user_server_access (user_id, server_id) VALUES (?, ?)`,
        [userId, serverId]
      )
    } else if (action === 'revoke') {
      await query(
        `DELETE FROM user_server_access WHERE user_id = ? AND server_id = ?`,
        [userId, serverId]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update user access error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
