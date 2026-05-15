import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Ensure tables
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await query(`
      CREATE TABLE IF NOT EXISTS event_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    let categories = await query(`SELECT name FROM categories ORDER BY name ASC`)
    let eventTypes = await query(`SELECT name FROM event_types ORDER BY name ASC`)

    // Seed defaults if tables exist but are empty (fresh DB before any ES sync)
    if (eventTypes.length === 0) {
      const defaults = [
        'player_joining', 'player_dropped', 'chat_message',
        'item_swapped', 'item_bought', 'diamonds_swapped',
        'tx_kicked', 'tx_banned', 'tx_warned', 'tx_healed', 'tx_dm',
        'tx_spectate_start', 'tx_action_revoked', 'tx_announcement',
        'resource_start', 'resource_stop'
      ]
      for (const name of defaults) {
        await query(`INSERT IGNORE INTO event_types (name) VALUES (?)`, [name])
      }
      eventTypes = await query(`SELECT name FROM event_types ORDER BY name ASC`)
    }

    return NextResponse.json({
      categories: categories.map(c => c.name),
      eventTypes: eventTypes.map(e => e.name)
    })
  } catch (error) {
    console.error('Meta list failed:', error)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

