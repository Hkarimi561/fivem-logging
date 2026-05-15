import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params
    const body = await request.json()
    const { userId, permissionLevel = 'viewer' } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    await query(
      `INSERT INTO server_admins (server_id, user_id, permission_level)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE permission_level = ?`,
      [serverId, userId, permissionLevel, permissionLevel]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Add server admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    await query(
      `DELETE FROM server_admins WHERE server_id = ? AND user_id = ?`,
      [serverId, userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove server admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params
    const body = await request.json()
    const { userId, permissionLevel } = body

    if (!userId || !permissionLevel) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await query(
      `UPDATE server_admins
       SET permission_level = ?
       WHERE server_id = ? AND user_id = ?`,
      [permissionLevel, serverId, userId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update server admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
