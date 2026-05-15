-- Migration: Discord OAuth -> local username/password auth
-- Run: docker compose exec -T mysql mysql -u fivem -pfivem fivem_logs < backend/database/migrations/002_local_auth.sql

USE fivem_logs;

-- Users: add local auth columns
ALTER TABLE users
  ADD COLUMN username VARCHAR(64) NULL UNIQUE AFTER id,
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER username,
  ADD COLUMN display_name VARCHAR(255) NULL AFTER password_hash;

UPDATE users SET username = discord_username WHERE username IS NULL AND discord_username IS NOT NULL;

-- Map server_admins.discord_id -> user_id before dropping discord columns
ALTER TABLE server_admins ADD COLUMN user_id INT NULL AFTER server_id;

UPDATE server_admins sa
INNER JOIN users u ON u.discord_id = sa.discord_id
SET sa.user_id = u.id
WHERE sa.user_id IS NULL;

DELETE FROM server_admins WHERE user_id IS NULL;

ALTER TABLE server_admins
  DROP INDEX unique_server_admin,
  DROP COLUMN discord_id;

ALTER TABLE server_admins
  MODIFY user_id INT NOT NULL,
  ADD UNIQUE KEY unique_server_admin (server_id, user_id),
  ADD CONSTRAINT fk_server_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop Discord columns from users
ALTER TABLE users
  DROP INDEX discord_id,
  DROP COLUMN discord_id,
  DROP COLUMN discord_username,
  DROP COLUMN discord_avatar,
  DROP COLUMN discord_email;

-- Sessions: remove Discord token columns
ALTER TABLE sessions
  DROP COLUMN discord_access_token,
  DROP COLUMN discord_refresh_token,
  DROP COLUMN discord_expires_at;

-- Servers: remove discord_guild_id
ALTER TABLE servers DROP COLUMN discord_guild_id;
