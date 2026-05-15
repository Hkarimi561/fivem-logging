import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { query, queryOne } from './db'
import { getTokenFromRequest } from './getToken'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
)

const PASSWORD_MIN_LENGTH = 8
const SESSION_SECONDS = 60 * 60 * 24 * 7 // 7 days

export function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  return null
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash)
}

export async function bootstrapAdminIfNeeded(username, password) {
  const row = await queryOne('SELECT COUNT(*) AS count FROM users')
  if (row.count > 0) return null

  const bootstrapUser = process.env.BOOTSTRAP_ADMIN_USERNAME
  const bootstrapPass = process.env.BOOTSTRAP_ADMIN_PASSWORD
  if (!bootstrapUser || !bootstrapPass) {
    return { error: 'no_bootstrap' }
  }

  if (username.trim().toLowerCase() !== bootstrapUser.trim().toLowerCase() || password !== bootstrapPass) {
    return null
  }

  const passwordError = validatePassword(bootstrapPass)
  if (passwordError) {
    return { error: 'invalid_bootstrap_password' }
  }

  const passwordHash = await hashPassword(bootstrapPass)
  const result = await query(
    `INSERT INTO users (username, password_hash, display_name, is_admin, last_login)
     VALUES (?, ?, ?, TRUE, NOW())`,
    [bootstrapUser.trim().toLowerCase(), passwordHash, bootstrapUser]
  )

  return { id: result.insertId, username: bootstrapUser, display_name: bootstrapUser, is_admin: true }
}

export async function authenticateUser(username, password) {
  const user = await queryOne(
    'SELECT * FROM users WHERE username = ?',
    [username.trim().toLowerCase()]
  )
  if (!user) return null

  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return null

  await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id])
  return user
}

export async function createUser({ username, password, displayName, isAdmin = false, serverIds = [] }) {
  const trimmedUsername = username.trim().toLowerCase()
  const passwordError = validatePassword(password)
  if (passwordError) throw new Error(passwordError)

  const existing = await queryOne('SELECT id FROM users WHERE username = ?', [trimmedUsername])
  if (existing) throw new Error('Username already exists')

  const passwordHash = await hashPassword(password)
  const result = await query(
    `INSERT INTO users (username, password_hash, display_name, is_admin)
     VALUES (?, ?, ?, ?)`,
    [trimmedUsername, passwordHash, displayName || trimmedUsername, isAdmin ? 1 : 0]
  )

  const userId = result.insertId

  for (const serverId of serverIds) {
    await query(
      `INSERT IGNORE INTO user_server_access (user_id, server_id) VALUES (?, ?)`,
      [userId, serverId]
    )
  }

  return queryOne('SELECT id, username, display_name, is_admin, last_login, created_at FROM users WHERE id = ?', [userId])
}

export async function createToken(user) {
  return new SignJWT({
    userId: user.id,
    username: user.username
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function upsertSession({ userId, token }) {
  await query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       expires_at = VALUES(expires_at)`,
    [userId, token, SESSION_SECONDS]
  )
}

export async function getSessionByToken(token) {
  return queryOne('SELECT * FROM sessions WHERE token = ?', [token])
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  const token = getTokenFromRequest()

  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return queryOne('SELECT * FROM users WHERE id = ?', [payload.userId])
}

export async function getUserServers(userId) {
  return query(
    `SELECT s.*
     FROM servers s
     INNER JOIN user_server_access usa ON s.id = usa.server_id
     WHERE usa.user_id = ? AND s.is_active = TRUE`,
    [userId]
  )
}

export async function canAccessChannel(userId, channelId) {
  const access = await queryOne(
    `SELECT s.id FROM log_channels lc
     INNER JOIN servers s ON lc.server_id = s.id
     INNER JOIN user_server_access usa ON s.id = usa.server_id
     WHERE usa.user_id = ? AND lc.id = ?`,
    [userId, channelId]
  )
  return !!access
}

export async function loginUser(user) {
  const token = await createToken(user)
  await upsertSession({ userId: user.id, token })
  return token
}
