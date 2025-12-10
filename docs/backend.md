# Task Manager – Backend Documentation

## 1. Overview

The **Task Manager System (MVP)** backend is built using a **microservice architecture** consisting of:

- **API Gateway** – entry point for all API requests  
- **Auth Service** – mock authentication for Sprint 2  
- **Boards Service** – boards, columns, tasks, ticket updates  
- **Audit Service** – audit logging  
- **MongoDB** – persistent NoSQL database  

The backend exposes a public REST API consumed by the React frontend.

---

## 2. Technology Stack

| Category        | Technology                  |
|----------------|------------------------------|
| Runtime        | Node.js (ES modules)         |
| Framework      | Express.js                   |
| Database       | MongoDB + Mongoose           |
| Auth           | JSON Web Tokens (JWT)        |
| Proxy          | http-proxy-middleware        |
| UUIDs          | uuid v4                      |
| Config         | dotenv                       |

---

## 3. Microservice Architecture

```
client (React SPA)
       ↓
 API Gateway (3001)
       ↓────────────↓──────────────↓
 Auth Service   Boards Service   Audit Service
 (4001)         (4002)           (4003)
       ↓────────────↓──────────────↓
               MongoDB
```

### Responsibilities

| Service         | Responsibility |
|----------------|----------------|
| API Gateway    | Routing, proxying, CORS, no business logic |
| Auth Service   | Login (mock JWT in Sprint 2) |
| Boards Service | Boards, columns, tasks, ticket fields |
| Audit Service  | Central audit logging |
| MongoDB        | Persistent datastore |

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
│   │       ├── Column.js
│   │       ├── Label.js
│   │       └── Task.js
│   ├── middleware/
│   │   ├── authRequired.js
│   │   ├── errorHandler.js
│   │   └── notFoundHandler.js
│   ├── modules/
│   │   ├── audit/
│   │   │   ├── audit-routes.js
│   │   │   └── audit-store.js
│   │   ├── auth/auth-routes.js
│   │   ├── boards/boards-routes.js
│   │   └── task/task-routes.js
│   └── utils/httpError.js
└── package.json
```

---

## 5. Database Layer (MongoDB + Mongoose)

### 5.1 Models

#### Board

```
{
  id: String,
  name: String,
  labels: [ { id, name } ],
  columns: [ { id, title, position } ],
  ownerEmail: String,
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
  assigneeId: String | null
}
```

#### AuditEntry

```
{
  id: String,
  actor: String,
  action: String,
  entity: String,
  entityId: String,
  ts: ISOString
}
```

---

## 6. API Gateway

### Responsibilities

- Proxies all incoming requests to microservices
- Handles CORS for the frontend
- Does **not** parse JSON bodies
- Rewrites paths for `/auth/*`
- Exposes `/health` and `/api` endpoints

### Proxy Mapping

| Gateway Path   | Service Target |
|----------------|----------------|
| `/auth/*`      | Auth Service   |
| `/boards/*`    | Boards Service |
| `/columns/*`   | Boards Service |
| `/tasks/*`     | Boards Service |
| `/tickets/*`   | Boards Service |
| `/audit/*`     | Audit Service  |

---

## 7. Auth Service

Provides mock authentication.

### Endpoint

#### `POST /auth/login-mock`

Returns:

```
{
  token: <jwt>,
  user: {
    id,
    name,
    email
  }
}
```

---

## 8. Boards Service

Handles boards, columns, tasks and full ticket functionality.

### 8.1 Board Endpoints

| Method | Path          | Description |
|--------|--------------|-------------|
| GET    | `/boards`     | List boards |
| POST   | `/boards`     | Create board |
| PATCH  | `/boards/:id` | Update name |
| DELETE | `/boards/:id` | Delete board + its tasks |

---

### 8.2 Columns Endpoints

| Method | Path                   | Description |
|--------|------------------------|-------------|
| GET    | `/boards/:id/columns`  | List columns |
| POST   | `/columns`             | Create column |
| PATCH  | `/columns/:id`         | Rename or move column |
| DELETE | `/columns/:id`         | Remove column |

---

### 8.3 Tasks Endpoints

| Method | Path                     | Description |
|--------|--------------------------|-------------|
| GET    | `/boards/:id/tasks`      | List tasks |
| POST   | `/boards/:id/tasks`      | Create task |
| PATCH  | `/tasks/:id`             | Update title (legacy) |
| PATCH  | `/tickets/:id`           | Update ticket fields |
| PATCH  | `/tasks/:id/move`        | Move task |
| DELETE | `/tasks/:id`             | Delete task |

---

## 9. Audit Service

Stores and retrieves audit entries.

### Endpoints

| Method | Path      | Description |
|--------|-----------|-------------|
| POST   | `/audit`  | Create audit entry |
| GET    | `/audit`  | Filter by entity/entityId |

---

## 10. Error Handling

Shared across all microservices:

### HttpError

- Custom error type with `status` and `code`.

### errorHandler

Returns JSON:

```
{
  "error": "<CODE>",
  "message": "<MESSAGE>"
}
```

### notFoundHandler

Unified 404 response.

---

## 11. Authentication Middleware

### `authRequired`

- Expects header: `Authorization: Bearer <token>`
- Verifies JWT
- Sets `req.user`
- Rejects unauthorized access

Protected routes include all board, task, column, ticket and audit endpoints.

---

## 12. Running Backend

Install dependencies:

```
npm install
```

Start all backend services:

```
npm run dev:backend
```

This launches:

- **Gateway**  
- **Auth Service**  
- **Boards Service**  
- **Audit Service**

---

## 13. Team Responsibilities

| Student            | Role |
|--------------------|------|
| Lucie Krausova     | PM, Analyst, Tester |
| Nurbol Kapesh      | BE/FE Developer |
| Oles Nesterenko    | BE Developer |
| Danil Chsherbina   | BE Developer |
| Maksym Popov       | FE Developer |
| Zubaydo Khalimova  | FE Developer |

---

## 14. Summary

The backend is structured for scalability, clarity, and microservice separation:

- Modular services  
- MongoDB persistence  
- JWT authentication  
- Audit logging  
- Full CRUD for boards, columns, tasks, ticket fields  
