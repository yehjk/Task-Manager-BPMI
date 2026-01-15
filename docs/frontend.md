# Task Manager – Frontend Documentation

## 1. Overview

The **Task Manager System (MVP)** frontend is a **single-page application (SPA)** built with **React** and bundled using **Vite**.

The frontend provides full user interaction with the system, including:

- User authentication (email/password + Google OAuth)
- Boards overview and filtering
- Board management (create, rename, delete)
- Columns and tasks management
- Drag & drop for columns and tasks
- Task details with audit log
- Board invitations and members management
- Toast-based user notifications
- Task due dates (displayed on cards and editable in ticket details)

The frontend communicates with backend services exclusively through a centralized API client and is designed to work behind a reverse proxy (e.g. **Caddy**) using a relative `/api` base path.

## 2. Technology Stack

| Category        | Technology |
|----------------|------------|
| Framework      | React 19 |
| State Store    | Zustand |
| Routing        | React Router |
| UI Framework  | Bootstrap 5 |
| Icons          | Material Design Icons (MDI) |
| Drag & Drop    | dnd-kit |
| Build Tool     | Vite |
| Language       | JavaScript (ES Modules) |

## 3. Project Structure

```text
client/
├── src/
│   ├── api/
│   │   └── api-client.js
│   ├── components/
│   │   ├── Column.jsx
│   │   ├── ColumnsSection.jsx
│   │   ├── Layout.jsx
│   │   ├── ModalDialogs.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── SortableColumn.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskModal.jsx
│   │   └── ToastProvider.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── OAuthCallbackPage.jsx
│   │   ├── BoardsListPage.jsx
│   │   ├── BoardPage.jsx
│   │   └── InvitesPage.jsx
│   ├── store/
│   │   ├── auth-store.js
│   │   └── board-store.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── .env
```

## 4. Application Lifecycle

### 4.1 Initialization

- `main.jsx` initializes authentication state via `initFromStorage()`
- The app is rendered inside `<BrowserRouter>`
- Global providers:
  - `ToastProvider`
  - React Router

### 4.2 Authentication Flow

Supported authentication methods:

#### Email & Password
- `POST /auth/login`
- `POST /auth/register`
- JWT token + user stored in `localStorage`
- The register form includes client-side "repeat password" confirmation (frontend validation only)

#### Google OAuth
- Frontend requests OAuth URL via `GET /auth/google/url`
- User is redirected to Google
- Backend redirects back to `/oauth-callback?token=...`
- Token is applied and decoded client-side

#### Protection
- `ProtectedRoute` blocks access until auth state is initialized
- Unauthorized users are redirected to `/login`

## 5. Routing

Defined in `App.jsx`.

| Path | Component | Protected |
|-----|----------|-----------|
| `/login` | LoginPage | No |
| `/oauth-callback` | OAuthCallbackPage | No |
| `/boards` | BoardsListPage | Yes |
| `/boards/:boardId` | BoardPage | Yes |
| `/invites` | InvitesPage | Yes |
| `/` | Redirect → `/boards` | Yes |
| `*` | Redirect → `/` | Yes |

## 6. API Layer

### 6.1 API Client (`api-client.js`)

Responsibilities:

- Resolve base URL:
  - `VITE_API_BASE_URL`
  - fallback: `/api`
- Attach `Content-Type: application/json`
- Attach JWT as `Authorization: Bearer <token>`
- Handle `401 Unauthorized` globally:
  - clear `localStorage`
  - redirect to `/login`
- Normalize errors and responses

### 6.2 Methods

```js
apiClient.get(path)
apiClient.post(path, body)
apiClient.patch(path, body)
apiClient.del(path)
```

## 7. Global State (Zustand)

### 7.1 Authentication Store

- Stores user, token, readiness flag
- Supports email/password and Google OAuth
- Persists session in `localStorage`

### 7.2 Board Store

- Boards, columns, tasks, labels
- Optimistic updates for drag & drop
- Centralized board-related logic

## 8. Drag & Drop System

- Implemented with **dnd-kit**
- Columns and tasks sortable
- Visual feedback during drag
- Backend sync after drop

## 9. Styling

- Bootstrap 5 base styles
- Custom overrides in `index.css`
- Responsive layout

## 10. Environment Configuration

```env
VITE_API_BASE_URL=/api
```

## 11. Running the Frontend

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## 12. Example Route: /boards/:boardId

- **Path:** `/boards/:boardId`
- **Component:** `BoardPage`
- **File:** `/client/src/pages/BoardPage.jsx`
- **Access:** Protected (authenticated users only)


### Purpose

Displays a single Kanban board with its columns and tasks and provides the main workspace for task management and collaboration.


### Inputs

- **Route params:**
  - `boardId`

- **Global state (Zustand):**
  - `useBoardStore` → board, columns, tasks, labels
  - `useAuthStore` → current user


### Main Responsibilities

- Load board and related data
- Render columns and tasks
- Open task details modal
- Allow owners to manage label, members, and columns


### Key Operations

- Load data:
  - `loadBoards()`
  - `loadBoardDetails(boardId)`

- Task actions:
  - Open → `TaskModal`
  - Delete → `deleteTask(taskId)`

- Owner actions:
  - Edit label → `createLabel / updateLabel`
  - Invite member → `POST /boards/:id/invites`
  - Remove member → `DELETE /boards/:id/members/:emailLower`


### Role Handling

User role is resolved on the frontend:

- If current user email equals board owner email → **owner**
- Owner permissions:
  - manage members
  - edit label
  - reorder and manage columns
- Member permissions:
  - manage tasks only


### UI Composition

Rendered child components:

- `ColumnsSection` — columns, tasks, drag & drop
- `TaskModal` — task details and audit log
- `TextInputModal` — label edit and invite dialogs
- `ConfirmModal` — member removal confirmation


### Code Evidence

```js
const { boardId } = useParams();

useEffect(() => {
  loadBoards();
  loadBoardDetails(boardId);
}, [boardId]);

<ColumnsSection
  boardId={boardId}
  canManageColumns={isOwner}
/>
```


## 13. Summary

The frontend is a production-ready MVP SPA featuring:

- JWT & Google OAuth authentication
- Modular React architecture
- Central API layer
- Zustand global state
- Drag & drop UX
- Audit log visualization
