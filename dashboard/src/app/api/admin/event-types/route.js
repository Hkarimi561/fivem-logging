import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import {
  ensureEventTypesTable,
  normalizeEventTypeName,
  validateEventTypeName
} from '@/lib/eventTypes'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || !Boolean(user.is_admin)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureEventTypesTable(query)
    const eventTypes = await query(
      `SELECT id, name, created_at FROM event_types ORDER BY name ASC`
    )

    return NextResponse.json({ eventTypes })
  } catch (error) {
    console.error('List event types error:', error)
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
    const name = normalizeEventTypeName(body.name)
    const validationError = validateEventTypeName(name)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    await ensureEventTypesTable(query)

    const existing = await queryOne(`SELECT id FROM event_types WHERE name = ?`, [name])
    if (existing) {
      return NextResponse.json({ error: 'Event type already exists' }, { status: 409 })
    }

    const result = await query(`INSERT INTO event_types (name) VALUES (?)`, [name])
    const created = await queryOne(
      `SELECT id, name, created_at FROM event_types WHERE id = ?`,
      [result.insertId]
    )

    return NextResponse.json({ eventType: created }, { status: 201 })
  } catch (error) {
    console.error('Create event type error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
