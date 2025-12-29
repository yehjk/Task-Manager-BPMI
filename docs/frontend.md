# Task Manager – Frontend Documentation

## 1. Overview

The **Task Manager System (MVP)** frontend is a single-page application (SPA) built with **React**.  
It provides functionality for:

- User authentication (mock)
- Viewing all boards
- Managing columns and tasks
- Drag & drop interactions
- Editing task details
- Viewing audit logs

The frontend communicates with the backend via a custom `api-client.js` wrapper and uses **Zustand** for state management.

---

## 2. Technology Stack

| Category        | Technology                 |
|----------------|----------------------------|
| Framework      | React 18                   |
| State Store    | Zustand                    |
| Routing        | React Router 6             |
| UI             | Bootstrap 5                |
| Icons          | Material Design Icons (MDI)|
| Drag & Drop    | dnd-kit                    |
| Build Tool     | Vite                       |
| Language       | JavaScript (ES2020+)       |

---

## 3. Project Structure

```text
client/
├── src/
│   ├── api/
│   │   └── api-client.js
│   ├── components/
│   │   ├── Column.jsx
│   │   ├── ColumnsSection.jsx
│   │   ├── LabelsPanel.jsx
│   │   ├── TaskCard.jsx
│   │   ├── TaskModal.jsx
│   │   ├── Layout.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── ModalDialogs.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── BoardsListPage.jsx
│   │   └── BoardPage.jsx
│   ├── store/
│   │   ├── auth-store.js
│   │   └── board-store.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── package-lock.json
├── vite.config.js
├── .env
└── index.html

```

---

## 4. Application Flow

### 4.1 Initialization

- `main.jsx` restores authentication state with `useAuthStore.getState().initFromStorage()`.
- React application is mounted inside `<BrowserRouter />`.

### 4.2 Authentication Flow

- `LoginPage` calls `POST /auth/login-mock`.
- Response contains fake JWT + user object.
- Token and user are stored in `localStorage` and in `auth-store`.
- `ProtectedRoute` checks `auth-store` and allows access only when user is authenticated.

---

## 5. Routing

Defined in `App.jsx`.

| Path              | Component        | Protected |
|-------------------|------------------|-----------|
| `/login`          | `LoginPage`      | No        |
| `/boards`         | `BoardsListPage` | Yes       |
| `/boards/:boardId`| `BoardPage`      | Yes       |
| `/`               | Redirect → `/boards` | Yes  |
| `*`               | Redirect → `/`   | Yes       |

---

## 6. API Layer

### 6.1 api-client.js

Responsibilities:

- Prepend API base URL (`VITE_API_BASE_URL` or `http://localhost:3001`).
- Attach `Content-Type: application/json` header.
- Read JWT from `localStorage` (`tm_token`) and send it as `Authorization: Bearer <token>`.
- Central 401 handling:
  - clear `tm_token` and `tm_user`
  - redirect user to `/login`
- Parse JSON responses and normalize errors.

### 6.2 Helper Methods

```js
apiClient.get(path);
apiClient.post(path, body);
apiClient.patch(path, body);
apiClient.del(path);
```

These are thin wrappers over the internal `request()` function.

---

## 7. Global State (Zustand)

### 7.1 Authentication Store (`auth-store.js`)

State:

- `user: object | null`
- `token: string | null`
- `isReady: boolean` – becomes true after initialization from storage.

Main actions:

```js
initFromStorage(); // read user + token from localStorage
loginMock();       // call POST /auth/login-mock, save user + token
logout();          // clear localStorage and state
isAuthenticated(); // helper, returns boolean
```

### 7.2 Board Store (`board-store.js`)

State:

- `boards: Board[]`
- `activeBoardId: string | null`
- `columns: Column[]`
- `tasks: Task[]`
- `labels: Label[]`
- `loadingBoards: boolean`
- `loadingBoard: boolean`
- `error: string | null`

#### Boards

```js
loadBoards();          // GET /boards
createBoard(name);     // POST /boards
updateBoard(id, name); // PATCH /boards/:id
deleteBoard(id);       // DELETE /boards/:id
```

#### Active Board Data

```js
setActiveBoard(boardId);
loadBoard(boardId);        // GET /boards/:id/columns, /tasks, /labels
loadBoardDetails(boardId); // alias for loadBoard
```

#### Columns

```js
createColumn(boardId, title);          // POST /columns
updateColumn(columnId, title);         // PATCH /columns/:id
deleteColumn(columnId);                // DELETE /columns/:id
moveColumn(columnId, targetPosition);  // PATCH /columns/:id (position)
```

#### Tasks

```js
createTask(boardId, columnId, title); // POST /boards/:id/tasks
updateTask(taskId, partial);          // PATCH /tasks/:id
deleteTask(taskId);                   // DELETE /tasks/:id
moveTask(taskId, columnId, position); // PATCH /tasks/:id/move
```

Additional helpers:

```js
updateTaskLocal(taskId, columnId, position);
updateTaskFromApi(task);
```

#### Labels

```js
createLabel(boardId, name);                     // POST /boards/:id/labels
updateLabel(boardId, labelId, name);           // PATCH /boards/:id/labels/:labelId
deleteLabel(boardId, labelId);                 // DELETE /boards/:id/labels/:labelId
```

Labels are used mainly for display and board sorting (first label of each board).

---

## 8. Components Overview

### 8.1 Layout

Provides navbar and wraps pages using `<Outlet />`.

### 8.2 ProtectedRoute

Handles access control using `auth-store`.

### 8.3 LoginPage

Mock login that stores JWT and redirects user.

### 8.4 BoardsListPage

Displays boards and provides create/rename/delete functionality.

### 8.5 BoardPage

Displays board details, columns, tasks, and task modal.

### 8.6 ColumnsSection

Handles rendering and drag & drop of columns & tasks.

### 8.7 Column

Renders single column and actions.

### 8.8 TaskCard

Draggable task preview.

### 8.9 TaskModal

Shows full task info, allows editing and displays audit log.

### 8.10 LabelsPanel

Manages board labels.

### 8.11 ModalDialogs

Reusable modals (`TextInputModal` / `ConfirmModal`).

---

## 9. Styling

Main styles in `index.css`.

Includes:

- navbar
- page layout
- board list
- buttons
- typography

Bootstrap used for base UI framework.

---

## 10. Running the Application

### Install dependencies

```bash
npm install
```

### Configure environment

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### Run project

```bash
npm run dev
```

App opens at:

```
http://localhost:5173
```

---

## 11. Team Roles

| Student            | Role |
|--------------------|------|
| Lucie Krausova     | PM, Analyst, Tester |
| Nurbol Kapesh      | BE/FE Developer |
| Oles Nesterenko    | BE Developer |
| Danil Chsherbina   | BE Developer |
| Maksym Popov       | FE Developer |
| Zubaydo Khalimova  | FE Developer |

---

## 12. Summary

The frontend architecture is clean, modular, and production‑ready for MVP, using:

- React SPA
- Zustand global state
- dnd-kit drag & drop
- clean API layer
- reusable modals
- sortable boards and tasks

