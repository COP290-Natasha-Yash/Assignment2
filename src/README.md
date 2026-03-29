# Project Management App — Frontend

A React + TypeScript frontend for a Kanban-style project management tool. Users can manage projects, boards, tasks, and team members — with role-based access control throughout.

---

## Tech Stack

- **React** with **TypeScript**
- **React Router v6** for client-side routing
- **CSS Modules** for scoped component styling
- REST API communication via a custom `fetchWithRefresh` utility

---

## Project Structure

```
src/
├── pages/
│   ├── Login.tsx           # Authentication — login form
│   ├── Register.tsx        # Authentication — registration form
│   ├── Dashboard.tsx       # Home screen — project list & management
│   ├── BoardsPage.tsx      # Boards list within a project
│   ├── BoardPage.tsx       # Kanban board — columns, tasks, drag & drop
│   └── MembersPage.tsx     # Project member management
├── styles/
│   ├── Login.module.css
│   ├── Register.module.css
│   ├── Dashboard.module.css
│   ├── Boards.module.css
│   ├── Board.module.css
│   └── Members.module.css
└── utils/
    └── fetchWithRefresh.ts  # Authenticated fetch with token refresh logic
```

---

## Pages & Features

### `Login.tsx`
Handles user login via email or username. On success, stores user data in `sessionStorage` and redirects to `/dashboard`.

### `Register.tsx`
Handles new account creation with name, email, username, and password. Redirects to the login page on success.

### `Dashboard.tsx`
The main landing page after login. Features include:

- List, create, edit, and archive/restore **projects**
- Filter projects by status: Active, Archived, or All
- View **all tasks** assigned to the current user across projects
- Browse **all users** in the system (Global Admins only)
- Notification bell with read/unread filtering
- Profile modal with avatar upload and name editing
- Logout

### `BoardsPage.tsx`
Displays all **boards** within a specific project. Features include:

- Create, rename, and delete boards
- Role-aware UI (only Admins/Global Admins can create or delete)
- Notification and profile management (same as Dashboard)
- Navigation to Boards, Members, and back to the Dashboard

### `BoardPage.tsx`
The core Kanban view for a specific board. Features include:

- **Columns** with drag-and-drop reordering
- **Tasks** with drag-and-drop between columns
- WIP (Work In Progress) limits per column — columns turn red when exceeded
- Create, edit, and delete tasks with: title, description, priority, type, assignee, due date, and parent story
- Task **detail panel** with full activity log (comments + audit trail)
- Markdown rendering in comments with a live preview toggle
- Edit and delete comments (own comments only)
- Closed/resolved tasks toggled via a "Show Closed" control
- Column management: rename, set WIP limit, delete
- Confirm modals for destructive actions (delete task, delete column, close task, etc.)
- Role-based permissions: Viewers cannot edit; Members can manage tasks; Admins can manage columns and boards

### `MembersPage.tsx`
Manages team membership for a project. Features include:

- List all project members with their roles (Admin, Member, Viewer)
- Search and filter members
- Add new members from the global user list with a selected role
- Change a member's role (Admin only)
- Remove members (Admin only)
- View a member's profile in the right panel

---

## Authentication & Token Refresh

### `fetchWithRefresh.ts`

A wrapper around the native `fetch` API that handles **JWT token refresh** transparently:

1. Makes the initial request with credentials (cookies).
2. If a `401 TOKEN_EXPIRED` response is received, it automatically calls `POST /api/auth/refresh`.
3. If the refresh succeeds, the original request is retried.
4. If the refresh fails (e.g. refresh token also expired), the user is logged out and redirected to `/`.

```ts
const res = await fetchWithRefresh(url, options, navigate);
```

All authenticated API calls throughout the app use this utility instead of `fetch` directly.

---

## Role System

The app enforces two layers of roles:

| Scope | Role | Permissions |
|---|---|---|
| Global | `GLOBAL_ADMIN` | Full access to everything across all projects |
| Project | `ADMIN` | Manage boards, columns, members, and tasks |
| Project | `MEMBER` | Create and edit tasks |
| Project | `VIEWER` | Read-only access |

Role checks are performed on both the frontend (UI gating) and expected to be enforced on the backend.

---

## API

The frontend expects a backend running at `http://localhost:3000` with the following base routes:

| Area | Base Path |
|---|---|
| Auth | `/api/auth` |
| Projects | `/api/projects` |
| Boards | `/api/projects/:projectId/boards` |
| Columns | `/api/boards/:boardId/columns` |
| Tasks | `/api/columns/:columnId/tasks` |
| Members | `/api/projects/:projectId/members` |
| Notifications | `/api/notifications` |
| Users | `/api/users` |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:3000`

### Install & Run

```bash
npm install
npm run dev
```

### Routes

| Path | Component |
|---|---|
| `/` | Login |
| `/register` | Register |
| `/dashboard` | Dashboard |
| `/projects/:projectId/boards` | BoardsPage |
| `/projects/:projectId/boards/:boardId` | BoardPage |
| `/projects/:projectId/members` | MembersPage |
