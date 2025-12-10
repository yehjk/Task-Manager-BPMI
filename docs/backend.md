
# Backend Documentation — Task Manager System

## Overview
The backend of the Task Manager System is built using **Node.js**, **Express**, and **MongoDB (Mongoose)**, structured as a **microservice architecture** consisting of:

- **Auth Service (4001)** — mock authentication, JWT issuing.
- **Boards Service (4002)** — boards, columns, tasks, ticket fields, drag & drop.
- **Audit Service (4003)** — centralized audit logging.
- **API Gateway (3001)** — proxies requests from the client to microservices.

Each service is fully isolated and runs independently, communicating only via HTTP.

---

## Technologies Used

- **Node.js 20+**
- **Express.js**
- **MongoDB + Mongoose ODM**
- **JSON Web Tokens (JWT)**
- **http-proxy-middleware** (API Gateway)
- **Zod-like custom validation through HttpError**

---

## Architecture Diagram (High-Level)

```
Client (React SPA)
       |
       v
API Gateway (3001)
 ├── /auth/*   → Auth Service (4001)
 ├── /boards/* → Boards Service (4002)
 └── /audit/*  → Audit Service (4003)
```

---

## Microservices

---

# 1. Auth Service (4001)

### Responsibilities
- Issues JWT tokens.
- Provides a mock login endpoint for development.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login-mock` | Returns a fake JWT + mock user |

### Token format

Payload contains:

```json
{
  "id": "user-1",
  "name": "Demo User",
  "email": "demo@example.com"
}
```

Expiration: **7 days**

---

# 2. Boards Service (4002)

### Responsibilities

- CRUD for **boards**
- CRUD for **columns**
- CRUD for **tasks** (with ticket fields)
- Drag & drop task movement
- Ticket system fields:
  - `description`
  - `assigneeId`

### Data Models

---

## Board Model

```js
{
  id: String,
  name: String,
  labels: [{ id, name }],
  columns: [{ id, title, position }],
  ownerEmail: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Column Model

Embedded inside `Board.columns`:

```js
{
  id: String,
  title: String,
  position: Number
}
```

---

## Task Model

Standalone Mongo collection:

```js
{
  id: String,
  boardId: String,
  columnId: String,
  position: Number,
  title: String,
  description: String,
  assigneeId: String | null
}
```

---

## Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/boards/:id/tasks` | Get tasks for a board |
| POST | `/boards/:id/tasks` | Create task |
| PATCH | `/tasks/:id` | Update title only (legacy) |
| PATCH | `/tickets/:id` | Update title, description, assigneeId |
| GET | `/tickets/:id` | Get full ticket |
| PATCH | `/tasks/:id/move` | Move drag & drop |
| DELETE | `/tasks/:id` | Delete + normalize |

### Task move logic

- Insert task into new position
- Renumber tasks in new column
- Renumber tasks in old column (if moved)

---

# 3. Audit Service (4003)

### Responsibilities

- Store audit log entries from Boards service.
- Provide filterable audit retrieval.

### Audit Schema

```js
{
  id: String,
  actor: String,        // usually user email
  action: String,       // TASK_CREATED, TICKET_UPDATED, etc.
  entity: String,       // task, ticket
  entityId: String,
  ts: ISOString
}
```

---

# 4. API Gateway (3001)

### Responsibilities

- Single entry point for the frontend.
- Proxies requests to appropriate microservices.
- Does not parse JSON body (to avoid interfering with proxied requests).

Proxy rules:

| Path | Proxied To |
|------|------------|
| `/auth/*` | Auth Service |
| `/boards`, `/columns`, `/tasks`, `/tickets` | Boards Service |
| `/audit` | Audit Service |

Health endpoints:

- `GET /health`
- `GET /api`

---

# Error Handling

All services use a shared error format:

```json
{
  "error": "TASK_NOT_FOUND",
  "message": "Task not found"
}
```

Errors are raised using:

```js
throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");
```

---

# Authentication Flow

The API Gateway does **not** validate tokens.  
Instead, each microservice validates JWT via `authRequired` middleware.

Unauthenticated requests return:

```json
{
  "error": "AUTH_REQUIRED",
  "message": "Authorization token missing"
}
```

---

# Development Notes

### Why Microservices?

- Independent deployment
- Faster development iteration
- Backend is clearly separated by responsibility
- Mimics real Enterprise architecture

### Why No JSON Middleware in Gateway?

Because gateway proxies raw bodies; JSON parsing would break forwarded requests.

---

# Running the Backend

1. Install dependencies:

```
npm install
```

2. Start all services:

```
npm run dev:backend
```



