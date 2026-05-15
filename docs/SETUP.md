# Installation & Setup Guide

This document outlines the end-to-end installation process for deploying the FiveM Log Management System in a production or development environment.

---

## 1. System Requirements

Before beginning, ensure your host machine (or isolated VPS instances) meet the following prerequisites:

- **Node.js:** v22.0 or higher.
- **MySQL:** v8.0 or higher (MariaDB equivalent is compatible).
- **Elasticsearch:** v9.x or higher (A single node is sufficient for most medium servers).
- **PM2 / Screen:** For managing background application processes in a production setting.

---

## 2. Elasticsearch Installation

Elasticsearch is the backbone of the logging system's timeseries storage.

1. Download and install Elasticsearch following the official guide for your OS.
2. Start the Elasticsearch service.
3. Verify that the node is running locally:
   ```bash
   curl -X GET "localhost:9200/"
   ```

---

## 3. Database Initialization

The relational state of the application (configurations, users, channels) is governed by MySQL.

1. Access your MySQL terminal:
   ```bash
   mysql -u root -p
   ```
2. Create the database and import the schema script:
   ```sql
   CREATE DATABASE fivem_logs;
   USE fivem_logs;
   source backend/database/schema.sql;
   ```
3. For existing installs upgrading from Discord OAuth, run the migration:
   ```bash
   mysql -u USER -p fivem_logs < backend/database/migrations/002_local_auth.sql
   ```

---

## 4. Backend Service Configuration (Ingest)

The backend service is responsible for ingesting logs and bridging Elasticsearch queries. It does not connect to MySQL.

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   npm install
   ```
2. Copy the template environment file:
   ```bash
   cp env.example .env
   ```
3. Ensure your Elasticsearch URL is correct inside `.env` (`ELASTICSEARCH_NODE=http://localhost:9200`).
4. Start the application:
   ```bash
   npm start
   ```
   *Note: Use PM2 or a systemd service file to keep this running permanently.*

---

## 5. Dashboard Deployment (Frontend)

The frontend visualizer runs via Next.js and connects to both MySQL (for settings/auth) and the Backend Ingest service.

1. Navigate to the `dashboard` directory:
   ```bash
   cd dashboard
   npm install
   ```
2. Copy the `.env` template:
   ```bash
   cp env.example .env.local
   ```
3. Update `.env.local`:
   ```text
   MYSQL_HOST=localhost
   MYSQL_USER=your_user
   MYSQL_PASSWORD=your_pass
   MYSQL_DATABASE=fivem_logs

   JWT_SECRET=super_secure_random_string

   BOOTSTRAP_ADMIN_USERNAME=admin
   BOOTSTRAP_ADMIN_PASSWORD=your-secure-password-min-8-chars

   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```
4. Build and start the Next.js production server:
   ```bash
   npm run build
   npm start
   ```

---

## 6. First login and user management

1. Open the dashboard at `http://localhost:3001/login` (or your server IP on port **3001**).
2. On first run (empty `users` table), sign in with `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` from your environment.
3. Open **Admin → Users → Add User** to create staff accounts. Assign **server access** when creating users so they can view logs.
4. Global admins (`is_admin`) see all servers; other users only see servers assigned in `user_server_access` or listed as `server_admins`.

---

## 7. Configuration Defaults

1. Open your MySQL client and find the `servers` table (or use **Admin → Servers** in the panel).
2. Insert a new server defining your identifier and a custom `api_key`:
   ```sql
   INSERT INTO servers (name, identifier, api_key)
   VALUES ('Main Roleplay Server', 'rp_server_1', 'fivem_3d31edce-c1a9-4ba1-837c-f905232c4a1e');
   ```
3. Grant a user access via the admin panel, or SQL:
   ```sql
   INSERT INTO user_server_access (user_id, server_id) VALUES (1, 1);
   ```
4. The Backend Lua ingest code uses `sv_projectName` as the server identifier. Read `docs/INTEGRATION.md` for FiveM server setup.

---

## Docker

From the project root:

```bash
docker compose up --build
```

Set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, and `JWT_SECRET` in a `.env` file next to `docker-compose.yml`. Dashboard: port **3001**, ingest API: port **3000**.
