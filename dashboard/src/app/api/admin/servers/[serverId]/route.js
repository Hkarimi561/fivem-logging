import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'

export async function GET(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params

    const server = await queryOne(
      `SELECT * FROM servers WHERE id = ?`,
      [serverId]
    )

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 })
    }

    const channels = await query(
      `SELECT * FROM log_channels WHERE server_id = ? ORDER BY name`,
      [serverId]
    )

    const admins = await query(
      `SELECT sa.*, u.username, u.display_name
       FROM server_admins sa
       LEFT JOIN users u ON u.id = sa.user_id
       WHERE sa.server_id = ?`,
      [serverId]
    )

    return NextResponse.json({ server, channels, admins })
  } catch (error) {
    console.error('Get server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser()

    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { serverId } = await params
    const body = await request.json()
    const { name, identifier, isActive } = body

    await query(
      `UPDATE servers SET
        name = COALESCE(?, name),
        identifier = COALESCE(?, identifier),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, identifier, isActive, serverId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update server error:', error)
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

    await query(`DELETE FROM servers WHERE id = ?`, [serverId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete server error:', error)
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
    const newApiKey = `fivem_${crypto.randomUUID()}`

    await query(
      `UPDATE servers SET api_key = ? WHERE id = ?`,
      [newApiKey, serverId]
    )

    return NextResponse.json({ apiKey: newApiKey })
  } catch (error) {
    console.error('Regenerate API key error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
