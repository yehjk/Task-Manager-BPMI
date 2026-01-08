# Task Manager – Deployment Documentation (Ubuntu + Caddy)

## 1. Overview

This document describes how to deploy the **Task Manager System (MVP)** to a Linux VPS (Ubuntu) using:

- **Node.js** services (API Gateway + 3 microservices)
- **MongoDB** (single shared datastore)
- **Caddy** (reverse proxy + HTTPS + static frontend hosting)
- **systemd** (run services on boot, restart on crash)

Target architecture:

```
Internet
   ↓  (80/443)
Caddy (HTTPS + reverse proxy + static files)
   ↓  (localhost)
API Gateway :3001  →  Auth :4001, Boards :4002, Audit :4003
   ↓
MongoDB (localhost only)
```

> Recommended security baseline: expose only **80/443** publicly; keep Node ports and MongoDB bound to **127.0.0.1**.

---

## 2. Prerequisites

### 2.1 Server requirements

- Ubuntu 22.04/24.04 (similar distros also work)
- Public domain pointing to the server (A/AAAA records), e.g. `taskmanagerapp.org`
- SSH access (non-root user with sudo)

### 2.2 Software to install

- Node.js (LTS)
- npm
- Git
- MongoDB Community Server
- Caddy (from official repository)

---

## 3. Server Preparation

### 3.1 Create a dedicated deploy user (optional but recommended)

If you already have a `deploy` user, skip.

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

### 3.2 Basic firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> Do **not** open 3001/4001/4002/4003/27017 to the internet.

---

## 4. Project Layout on the Server

Recommended layout (example):

```
/opt/taskmanager/
  ├── repo/               # git clone here
  ├── logs/               # optional, for manual logs
  └── env/                # optional, if you keep env files here
```

Create folders and set ownership:

```bash
sudo mkdir -p /opt/taskmanager
sudo chown -R deploy:deploy /opt/taskmanager
```

---

## 5. Getting the Code (Git)

```bash
cd /opt/taskmanager
git clone <YOUR_REPO_URL> repo
cd repo
```

---

## 6. MongoDB Deployment + Hardening

### 6.1 Install MongoDB

Install MongoDB Community (recommended). The exact commands differ by Ubuntu version; follow the official MongoDB install docs for your distro.

After install, start + enable:

```bash
sudo systemctl enable --now mongod
sudo systemctl status mongod --no-pager
```

### 6.2 Bind MongoDB to localhost

Edit MongoDB config:

```bash
sudo nano /etc/mongod.conf
```

Ensure:

```yaml
net:
  bindIp: 127.0.0.1
  port: 27017
```

Restart:

```bash
sudo systemctl restart mongod
```

### 6.3 Enable MongoDB authentication (recommended)

1) Open Mongo shell:

```bash
mongosh
```

2) Create admin user:

```js
use admin
db.createUser({
  user: "admin",
  pwd: "CHANGE_ME_STRONG_PASSWORD",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, { role: "readWriteAnyDatabase", db: "admin" } ]
})
```

3) Enable auth in `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

Restart MongoDB:

```bash
sudo systemctl restart mongod
```

4) Create a dedicated DB user for the app:

```bash
mongosh -u admin -p --authenticationDatabase admin
```

```js
use taskmanager
db.createUser({
  user: "taskmanager_app",
  pwd: "CHANGE_ME_STRONG_PASSWORD",
  roles: [ { role: "readWrite", db: "taskmanager" } ]
})
```

### 6.4 MONGODB_URI to use in the app

Use localhost + credentials:

```bash
MONGODB_URI=mongodb://taskmanager_app:CHANGE_ME_STRONG_PASSWORD@127.0.0.1:27017/taskmanager?authSource=taskmanager
```

> If you skip auth (not recommended), you can keep `MONGODB_URI=mongodb://127.0.0.1:27017/taskmanager`.

---

## 7. Backend Deployment (Node microservices)

### 7.1 Install server dependencies

```bash
cd /opt/taskmanager/repo/server
npm install
```

### 7.2 Create backend `.env`

Create:

```bash
nano /opt/taskmanager/repo/server/.env
```

Example (production-style):

```bash
# Gateway
PORT=3001
CLIENT_ORIGIN=https://taskmanagerapp.org

AUTH_SERVICE_URL=http://127.0.0.1:4001
BOARDS_SERVICE_URL=http://127.0.0.1:4002
AUDIT_SERVICE_URL=http://127.0.0.1:4003

# Services ports
AUTH_PORT=4001
BOARDS_PORT=4002
AUDIT_PORT=4003

# App
APP_BASE_URL=https://taskmanagerapp.org

# Mongo
MONGODB_URI=mongodb://taskmanager_app:CHANGE_ME@127.0.0.1:27017/taskmanager?authSource=taskmanager

# JWT
JWT_SECRET=CHANGE_ME_LONG_RANDOM
JWT_EXPIRES_IN=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://taskmanagerapp.org/auth/google/callback
```

### 7.3 Run backend manually (smoke test)

In `/server`:

```bash
npm run dev:backend
```

Check:

- `http://127.0.0.1:3001/health` should return JSON
- `http://127.0.0.1:3001/api` should return metadata

Stop (Ctrl+C).

---

## 8. Run Backend as systemd Services (recommended)

### 8.1 Option A – single systemd unit for all services (simple)

Create unit:

```bash
sudo nano /etc/systemd/system/taskmanager.service
```

Example:

```ini
[Unit]
Description=Task Manager Backend (Gateway + Auth + Boards + Audit)
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/taskmanager/repo/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run dev:backend
Restart=always
RestartSec=3
# Optional limits
# LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Reload + enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now taskmanager-backend
sudo systemctl status taskmanager-backend --no-pager
```

Logs:

```bash
sudo journalctl -u taskmanager-backend -n 200 --no-pager
```

> If you prefer more control, create 4 units (gateway/auth/boards/audit) instead of one.

---

## 9. Frontend Deployment (Vite build)

### 9.1 Build the frontend

```bash
cd /opt/taskmanager/repo/client
npm install
```

Create `.env.production` (or set env when building):

```bash
nano /opt/taskmanager/repo/client/.env.production
```

Example:

```bash
VITE_API_BASE_URL=/api
```

Build:

```bash
npm run build
```

Vite output is usually:

- `client/dist/`

---

## 10. Caddy Reverse Proxy + HTTPS

Caddy terminates HTTPS and routes:

- `/` → serves frontend static files (`client/dist`)
- API routes → proxies to the **API Gateway** (localhost:3001)

### 10.1 Install Caddy

Install from the official Caddy repository for your distro (recommended).
After install:

```bash
sudo systemctl enable --now caddy
sudo systemctl status caddy --no-pager
```

### 10.2 Create the Caddyfile (required)

Edit:

```bash
sudo nano /etc/caddy/Caddyfile
```

Example Caddyfile (recommended for SPA + API gateway):

```caddyfile
taskmanagerapp.org, www.taskmanagerapp.org {
        # tls directories
        handle /api/auth/* {
                uri strip_prefix /api
                reverse_proxy 127.0.0.1:4001
        }

        # AUDIT  
        handle /api/audit* {
                uri strip_prefix /api
                reverse_proxy 127.0.0.1:4003
        }

        # BOARDS + TASKS
        handle /api/* {
                uri strip_prefix /api
                reverse_proxy 127.0.0.1:4002
        }

        # FRONTEND
        handle {
                root * /opt/taskmanager/repo/client/dist
                try_files {path} /index.html
                file_server
        }
}
```

> If your frontend uses `VITE_API_BASE_URL=/api`, you can optionally rewrite API paths to your gateway routes.  
> In your current gateway, routes are `/auth`, `/boards`, `/tasks`, etc.  
> If you want **everything** to go through `/api/...`, you would add rewrite rules. The config above supports both `/api/*` and direct `/auth/*` etc.

### 10.3 Validate + apply Caddy config

```bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Check logs:

```bash
sudo journalctl -u caddy -n 200 --no-pager
```

### 10.4 TLS notes

- Caddy will automatically obtain and renew certificates (Let’s Encrypt) for the domain.
- Make sure DNS is correct and ports **80/443** are reachable from the internet.
- If you used Let’s Encrypt **staging** previously, switch to production by removing staging settings (if any) and reloading Caddy.

---

## 11. Permissions & Security Notes

### 11.1 File permissions

- Code owned by `deploy:deploy`
- System files owned by root
- Caddy must be able to read frontend `dist` directory:

```bash
sudo chown -R deploy:deploy /opt/taskmanager/repo
sudo chmod -R o+rX /opt/taskmanager/repo/client/dist
```

(Or ensure the directory is world-readable; Caddy runs as its own user.)

### 11.2 Keep internal ports private

Confirm services bind to localhost only (recommended).
If your Node services listen on all interfaces by default, rely on firewall + do not open ports.

### 11.3 Secrets management

Do not commit `.env` files to git. On the server:
- keep `/server/.env` and optionally `/client/.env.production` outside the repo (or ensure they are ignored).

---

## 12. Verification Checklist

### Backend

- `curl http://127.0.0.1:3001/health` returns `{ status: "ok", ... }`
- `sudo systemctl status taskmanager-backend` is active
- MongoDB is running: `sudo systemctl status mongod`

### Caddy + HTTPS

- `https://taskmanagerapp.org` opens the frontend
- `https://taskmanagerapp.org/health` returns gateway JSON
- Auth works (register/login)

### Frontend

- Frontend calls API successfully (check browser devtools → Network)

---

## 13. Common Issues

### 13.1 502 Bad Gateway from Caddy
- Gateway is not running (`taskmanager-backend` down)
- Wrong proxy target (`127.0.0.1:3001`)
- Firewall blocks localhost (rare)
- Check logs:
  - `sudo journalctl -u taskmanager-backend -n 200 --no-pager`
  - `sudo journalctl -u caddy -n 200 --no-pager`

### 13.2 Caddy can’t read /dist
- Fix permissions: `sudo chmod -R o+rX /opt/taskmanager/repo/client/dist`

### 13.3 MongoDB auth failures
- Wrong username/password/authSource in `MONGODB_URI`
- User created in different DB than `authSource`

### 13.4 OAuth callback mismatch (Google)
- `GOOGLE_REDIRECT_URI` must match exactly what’s configured in Google Cloud Console.
- Ensure HTTPS and correct domain.


