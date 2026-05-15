import { NextResponse } from 'next/server'
import { getCurrentUser, getUserServers } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const servers = await getUserServers(user.id)

    return NextResponse.json({ servers })
  } catch (error) {
    console.error('Get servers error:', error)
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
    const { name, identifier } = body

    if (!name || !identifier) {
      return NextResponse.json({ error: 'name and identifier are required' }, { status: 400 })
    }

    const apiKey = `fivem_${crypto.randomUUID()}`

    const result = await query(
      `INSERT INTO servers (name, identifier, api_key)
       VALUES (?, ?, ?)`,
      [name, identifier, apiKey]
    )

    return NextResponse.json({
      id: result.insertId,
      name,
      identifier,
      apiKey
    })
  } catch (error) {
    console.error('Create server error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
