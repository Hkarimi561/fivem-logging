import { parseJsonField } from './jsonField'

/** Shared helpers for the event_types registry (MySQL). */

export function normalizeEventTypeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export function validateEventTypeName(name) {
  if (!name) return 'Name is required'
  if (name.length > 255) return 'Name must be 255 characters or less'
  if (!/^[a-z0-9_]+$/.test(name)) {
    return 'Use lowercase letters, numbers, and underscores only (e.g. player_joining)'
  }
  return null
}

export async function ensureEventTypesTable(query) {
  await query(`
    CREATE TABLE IF NOT EXISTS event_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function renameInLogChannels(query, oldName, newName) {
  const channels = await query(`SELECT id, event_types FROM log_channels`)
  for (const ch of channels) {
    const types = parseJsonField(ch.event_types, [])
    if (!types.includes(oldName)) continue
    const updated = types.map(t => (t === oldName ? newName : t))
    await query(`UPDATE log_channels SET event_types = ? WHERE id = ?`, [
      JSON.stringify(updated),
      ch.id
    ])
  }
}

export async function removeFromLogChannels(query, name) {
  const channels = await query(`SELECT id, event_types FROM log_channels`)
  for (const ch of channels) {
    const types = parseJsonField(ch.event_types, [])
    if (!types.includes(name)) continue
    const updated = types.filter(t => t !== name)
    await query(`UPDATE log_channels SET event_types = ? WHERE id = ?`, [
      JSON.stringify(updated),
      ch.id
    ])
  }
}
