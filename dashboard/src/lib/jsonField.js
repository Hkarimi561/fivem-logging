/** Parse MySQL JSON column values (mysql2 may return object/array or string). */
export function parseJsonField(value, fallback = []) {
  if (value == null || value === '') return fallback
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }
  return fallback
}
