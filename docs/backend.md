# Task Manager – Backend Documentation

## 1. Overview

The **Task Manager System (MVP)** backend uses a **microservice architecture**:

- **API Gateway** – entry point for all API requests  
- **Auth Service** – user registration/login + Google OAuth (PKCE)  
- **Boards Service** – boards, labels, columns, tasks, invites, stats  
- **Audit Service** – audit logging (create + query)  
- **MongoDB** – persistent NoSQL database  

The backend exposes a public REST API consumed by the React frontend.

---

## 2. Technology Stack

| Category | Technology |
|---|---|
| Runtime | Node.js (ES modules) |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Proxy | http-proxy-middleware |
| IDs | uuid v4 |
| Config | dotenv |
| Tooling | concurrently, nodemon |

---

## 3. Microservice Architecture

```
client (React SPA)
       ↓
 API Gateway (PORT=3001)
       ↓────────────↓──────────────↓
 Auth Service   Boards Service   Audit Service
 (AUTH_PORT)    (BOARDS_PORT)    (AUDIT_PORT)
       ↓────────────↓──────────────↓
               MongoDB
```

### Responsibilities

| Service | Responsibility |
|---|---|
| API Gateway | Routing/proxying, CORS, `/health` + `/api` metadata |
| Auth Service | Register/login, `/me`, Google OAuth flow |
| Boards Service | Boards CRUD, labels, members, invites, columns, tasks, move logic |
| Audit Service | Persist and retrieve audit entries |
| MongoDB | Single datastore used by all services |

---

## 4. Project Structure

```
server/
├── src/
│   ├── gateway.js
│   ├── auth-service.js
│   ├── boards-service.js
│   ├── audit-service.js
│   ├── db/
│   │   ├── mongo.js
│   │   └── models/
│   │       ├── AuditEntry.js
│   │       ├── Board.js
│   │       ├── BoardInvite.js
│   │       ├── Task.js
│   │       └── User.js
│   ├── middleware/
│   │   ├── authRequired.js
│   │   ├── errorHandler.js
│   │   └── notFoundHandler.js
│   ├── modules/
│   │   ├── audit/
│   │   │   ├── audit-routes.js
│   │   │   └── audit-store.js
│   │   ├── auth/
│   │   │   └── auth-routes.js
│   │   ├── boards/
│   │   │   └── boards-routes.js
│   │   └── task/
│   │       └── task-routes.js
│   └── utils/
│       └── httpError.js
└── package.json
```

---

## 5. Database Layer (MongoDB + Mongoose)

### 5.1 Models (High Level)

#### User

- `authProvider`: `local` or `google`
- `emailLower` is unique + indexed

```
{
  id: String,
  name: String,
  email: String,
  emailLower: String,
  authProvider: "local" | "google",
  providerId: String | null,
  passwordHash: String | null,
  createdAt, updatedAt
}
```

#### Board

- Stores **columns** and **labels** embedded in the board document.
- Supports **members** (role: `"member"`).
- Owner is stored as `ownerEmailLower` (indexed).

```
{
  id: String,
  name: String,
  labels: [ { id, name } ],
  columns: [ { id, title, position, isDone } ],
  ownerEmail: String | null,
  ownerEmailLower: String | null,
  members: [ { email, emailLower, role, joinedAt } ],
  createdAt, updatedAt
}
```

#### BoardInvite

- Supports invite lifecycle: `pending → accepted | revoked`
- Indexed on `boardId`, `emailLower`

```
{
  id: String,
  boardId: String,
  email: String,
  emailLower: String,
  invitedByEmail: String,
  invitedByEmailLower: String,
  role: "member",
  status: "pending" | "accepted" | "revoked",
  acceptedAt: Date | null,
  revokedAt: Date | null,
  createdAt, updatedAt
}
```

#### Task

```
{
  id: String,
  boardId: String,
  columnId: String,
  position: Number,
  title: String,
  description: String,
  assigneeId: String | null,

  dueDate: String | null,   // format: "YYYY-MM-DD"

  createdAt, updatedAt
}
```

#### AuditEntry

- Optional `boardId` for filtering
- `details` can store a flexible payload (`Mixed`)

```
{
  id: String,
  actor: String,
  action: String,
  entity: String,
  entityId: String,
  boardId: String | null,
  details: any | null,
  ts: ISOString
}
```

---

## 6. API Gateway

### Responsibilities

- Central entry for frontend requests (CORS)
- Proxies requests to services based on path
- Exposes health/info endpoints:
  - `GET /health`
  - `GET /api`

### Proxy Mapping

| Gateway Path (public) | Service Target |
|---|---|
| `/api/auth/*` | Auth Service |
| `/api/boards/*` | Boards Service |
| `/api/columns/*` | Boards Service |
| `/api/tasks/*` | Boards Service |
| `/api/tickets/*` | Boards Service |
| `/api/invites/*` | Boards Service |
| `/api/audit/*` | Audit Service |


---

## 7. Authentication

### JWT

- Client sends `Authorization: Bearer <token>`
- Middleware `authRequired` verifies token and loads user from DB.

### Auth endpoints (Auth Service)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create local account |
| POST | `/auth/login` | Login with email/password |
| GET | `/auth/me` | Get current user (requires JWT) |
| GET | `/auth/google/url` | Get Google OAuth URL (PKCE) |
| GET | `/auth/google/callback` | OAuth callback → redirects to frontend with token |

> Note: The Google flow uses an in-memory state store with TTL (10 minutes).

---

## 8. Boards, Members, Invites

### Boards endpoints (Boards Service)

| Method | Path | Description |
|---|---|---|
| GET | `/boards` | List boards where user is owner or member + computed stats |
| POST | `/boards` | Create board (owner = current user) |
| GET | `/boards/:id` | Get single board (access required) |
| PATCH | `/boards/:id` | Rename board (owner only) |
| DELETE | `/boards/:id` | Delete board + tasks + invites (owner only) |

### Labels endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/boards/:id/labels` | List labels |
| POST | `/boards/:id/labels` | Create label (owner only) |
| PATCH | `/boards/:id/labels/:labelId` | Rename label (owner only) |

### Members endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/boards/:id/members` | Get owner + members |
| DELETE | `/boards/:id/members/:emailLower` | Remove member (owner only) |

### Invites endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/boards/:id/invites` | Create invite (owner only) |
| GET | `/invites?type=incoming|outgoing&status=pending|accepted|revoked|all` | List invites |
| POST | `/invites/:inviteId/accept` | Accept invite (invitee only) |
| POST | `/invites/:inviteId/revoke` | Revoke invite (inviter or owner) |

---

## 9. Columns & Tasks

### Columns endpoints (Boards Service)

| Method | Path | Description |
|---|---|---|
| GET | `/boards/:id/columns` | List columns |
| POST | `/columns` | Create column (owner only) |
| PATCH | `/columns/:id` | Update title/position/isDone (owner only) |
| DELETE | `/columns/:id` | Delete column + its tasks (owner only) |

### Tasks endpoints (Boards Service)

| Method | Path | Description |
|---|---|---|
| GET | `/boards/:id/tasks` | List tasks (sorted by `position`) |
| POST | `/boards/:id/tasks` | Create task (supports optional `dueDate`) |
| GET | `/tickets/:id` | Get single task by id |
| PATCH | `/tasks/:id` | Update title/description/assigneeId/**dueDate** |
| PATCH | `/tasks/:id/move` | Move task to another column and/or position (auto-normalizes positions) |
| DELETE | `/tasks/:id` | Delete task + normalize remaining positions |

**Positioning rules:**
- Tasks are ordered per column by integer `position`.
- On moves/deletes, the service normalizes positions so they are contiguous (1..N).

**Due date rules:**
- `dueDate` format: `YYYY-MM-DD`
- `dueDate: null` removes due date

---

## 10. Audit Service

### Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/audit` | Create audit entry (requires JWT) |
| GET | `/audit?entity=&entityId=&boardId=` | Query audit entries (requires JWT) |

Audit entries are also created internally by Boards/Tasks routes for key actions:
- Board created/updated/deleted  
- Label created/updated  
- Column created/updated/deleted  
- Task created/updated/moved/deleted  
- Invites created/accepted/revoked  
- Member removed  

---

## 11. Error Handling

Shared across all services:

### `HttpError`
- Throw `new HttpError(status, code, message)` anywhere.
- Global `errorHandler` formats it into JSON:

```
{
  "error": "<CODE>",
  "message": "<MESSAGE>"
}
```

### `notFoundHandler`
Returns:

```
{
  "error": "NOT_FOUND",
  "message": "Route not found"
}
```

---

## 12. Running Backend

### Install

```bash
cd server
npm install
```

### Run all services (development)

```bash
npm run dev:backend
```

This starts:
- Auth Service
- Boards Service
- Audit Service
- API Gateway

---

## 13. Environment Variables

Minimal typical `.env` (example):

```bash
# Ports
PORT=3001
AUTH_PORT=4001
BOARDS_PORT=4002
AUDIT_PORT=4003

# Client
CLIENT_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173

# Service URLs for gateway (optional if local)
AUTH_SERVICE_URL=http://localhost:4001
BOARDS_SERVICE_URL=http://localhost:4002
AUDIT_SERVICE_URL=http://localhost:4003

# Database
MONGODB_URI=mongodb://localhost:27017/taskmanager

# Auth
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d

# Google OAuth (optional for local-only)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4001/auth/google/callback
```

---

## 14. Source Code Reference (as provided)

The following modules implement the above behavior:

- `/src/gateway.js`
- `/src/auth-service.js` + `/src/modules/auth/auth-routes.js`
- `/src/boards-service.js` + `/src/modules/boards/boards-routes.js`
- `/src/modules/task/task-routes.js`
- `/src/audit-service.js` + `/src/modules/audit/*`
- `/src/middleware/*`
- `/src/db/models/*`
