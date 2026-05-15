import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import {
  ensureEventTypesTable,
  normalizeEventTypeName,
  validateEventTypeName,
  renameInLogChannels,
  removeFromLogChannels
} from '@/lib/eventTypes'

export async function PUT(request, { params }) {
  try {
    const user = await getCurrentUser()
    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const newName = normalizeEventTypeName(body.name)

    const validationError = validateEventTypeName(newName)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    await ensureEventTypesTable(query)

    const existing = await queryOne(`SELECT id, name FROM event_types WHERE id = ?`, [id])
    if (!existing) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
    }

    if (existing.name === newName) {
      return NextResponse.json({ eventType: existing })
    }

    const duplicate = await queryOne(
      `SELECT id FROM event_types WHERE name = ? AND id != ?`,
      [newName, id]
    )
    if (duplicate) {
      return NextResponse.json({ error: 'Event type already exists' }, { status: 409 })
    }

    await query(`UPDATE event_types SET name = ? WHERE id = ?`, [newName, id])
    await renameInLogChannels(query, existing.name, newName)

    const updated = await queryOne(
      `SELECT id, name, created_at FROM event_types WHERE id = ?`,
      [id]
    )

    return NextResponse.json({ eventType: updated })
  } catch (error) {
    console.error('Update event type error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getCurrentUser()
    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    await ensureEventTypesTable(query)

    const existing = await queryOne(`SELECT id, name FROM event_types WHERE id = ?`, [id])
    if (!existing) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 })
    }

    await removeFromLogChannels(query, existing.name)
    await query(`DELETE FROM event_types WHERE id = ?`, [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete event type error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
