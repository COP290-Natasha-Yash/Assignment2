# Project Management App — Backend

A REST API backend built with Express and TypeScript, backed by a SQLite database via Prisma ORM. Handles authentication, project/board/task management, and team membership with role-based access control.

---

## Tech Stack

- **Node.js** with **TypeScript** (strict mode, no `any` types)
- **Express v5** — HTTP server and routing
- **Prisma ORM** — database access and migrations
- **SQLite** via `better-sqlite3` — lightweight file-based database
- **JWT** — access + refresh token authentication
- **bcrypt** — password hashing
- **Multer** — file/avatar uploads
- **Jest** + **Supertest** — unit and integration testing
- **ESLint** + **Prettier** — code quality and formatting

---

## Project Structure

```
backend/
├── src/
│   ├── server.ts              # Express app entry point
│   ├── prisma.ts              # Prisma client instance
│   ├── generated/             # Auto-generated Prisma types (gitignored)
│   └── tests/
│       ├── setup.ts           # Global test setup
│       ├── teardown.ts        # Global test teardown
│       ├── env.ts             # Test environment variables
│       └── integration/       # Integration test suites
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Prisma migration history
│   └── seed.ts                # Database seeder
├── .env                       # Local environment variables (gitignored)
├── .env.test                  # Test environment variables
├── prisma.config.ts           # Prisma configuration
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Unit test config
├── jest.integration.config.ts # Integration test config
├── eslint.config.js           # ESLint rules
└── .prettierrc                # Prettier formatting rules
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Environment Setup

Create a `.env` file in the root:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_access_token_secret"
JWT_REFRESH_SECRET="your_refresh_token_secret"
```

### Database Setup

```bash
# Run migrations
npx prisma migrate dev

# Seed the database with a default admin user
npm run seed
```

The seed creates the following admin account:

| Field    | Value                  |
|----------|------------------------|
| Email    | `admin@taskboard.com`  |
| Username | `_admin_`              |
| Password | `admin123`             |
| Role     | `GLOBAL_ADMIN`         |

### Run in Development

```bash
npm run dev
```

The server starts with `nodemon` and auto-restarts on file changes.

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run seed` | Seed the database with an admin user |
| `npm test` | Run unit tests |
| `npm run test:integration` | Run integration tests |
| `npm run lint` | Lint all source files |
| `npm run format` | Format all source files with Prettier |

---

## Authentication

Authentication uses a **dual-token JWT strategy**:

- **Access token** — short-lived, sent as an HTTP-only cookie
- **Refresh token** — longer-lived, used to issue new access tokens

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/register` | POST | Create a new user account |
| `/api/auth/login` | POST | Login and receive tokens |
| `/api/auth/refresh` | POST | Refresh the access token |
| `/api/auth/logout` | POST | Invalidate tokens |

---

## API Overview

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

## Role System

Two layers of roles are enforced on the backend:

| Scope | Role | Permissions |
|---|---|---|
| Global | `GLOBAL_ADMIN` | Full access across all projects |
| Project | `ADMIN` | Manage boards, columns, members, and tasks |
| Project | `MEMBER` | Create and edit tasks |
| Project | `VIEWER` | Read-only access |

---

## Database

Prisma is configured to use SQLite:

- **Development DB:** `dev.db`
- **Test DB:** `test.db`

The Prisma config is defined in `prisma.config.ts` and reads the `DATABASE_URL` from the environment.

---

## Testing

### Unit Tests (Modular)

```bash
npm test
```

Uses `jest` with `ts-jest`. Tests match `**/*.test.ts` and run with global setup/teardown (`setup.ts` / `teardown.ts`) and a dedicated test environment (`env.ts`).

Each source file has its own isolated test file that tests only that file's logic independently — without relying on the full request/response cycle. These are entirely separate from the integration test suite.

### Integration Tests

```bash
npm run test:integration
```

Uses a separate Jest config (`jest.integration.config.ts`) targeting `tests/integration/**/*.test.ts`. Runs serially (`maxWorkers: 1`) against `test.db` with a 15-second timeout per test. Each test resets the database state via `setupEach()` before running.

The integration test suite covers the following areas:

**Auth** (`auth.integration.test.ts`)
- `POST /api/auth/register` — success, missing fields, invalid email, duplicate email/username, username with `@`, httpOnly cookie set
- `POST /api/auth/login` — login by email, login by username, wrong password, non-existent user, missing identifier, cookie set
- `POST /api/auth/logout` — success, unauthenticated, already logged out
- `POST /api/auth/refresh` — success, no token, invalid token

**Projects & Members** (`projects.integration.test.ts`)
- `POST /api/projects` — admin creates project, non-admin blocked, missing name, unauthenticated
- `GET /api/projects` — admin sees all, regular user sees only their projects
- `GET /api/projects/:id` — member access, non-member blocked, not found
- `PATCH /api/projects/:id` — update name, empty name rejected
- `PATCH /api/projects/:id/archive` — archive, unarchive, already archived, invalid value
- `POST /api/projects/:id/members` — add member, duplicate blocked, invalid role, user not found, non-admin blocked
- `GET /api/projects/:id/members` — returns full member list
- `PATCH /api/projects/:id/members/:userId` — update role, invalid role, member not found
- `DELETE /api/projects/:id/members/:userId` — remove member, not found

**Boards & Columns** (`boards.integration.test.ts`)
- `POST /api/projects/:id/boards` — creates board with 5 default columns (including `TO_DO` and `CLOSED`), missing name, non-admin blocked
- `GET /api/projects/:id/boards` — returns all boards
- `GET /api/projects/:id/boards/:boardId` — single board, not found
- `PATCH /api/projects/:id/boards/:boardId` — rename, empty name rejected
- `DELETE /api/projects/:id/boards/:boardId` — delete, not found
- `POST .../columns` — create column, with WIP limit, missing name, non-admin blocked
- `GET .../columns` — returns all columns sorted by order
- `GET .../columns/:columnId` — single column, not found
- `PATCH .../columns/:columnId` — rename, set WIP limit, WIP limit below current task count rejected
- `DELETE .../columns/:columnId` — delete custom column, deleting `CLOSED` column blocked
- `PATCH .../columns/reorder` — reorder columns, missing array, reordering `CLOSED` column blocked

**Tasks, Comments & Notifications** (`tasks.integration.test.ts`)
- `POST .../tasks` — create task, with WIP limit enforcement, missing title, non-member blocked
- `GET .../tasks` — returns all tasks in column
- `GET .../tasks/:taskId` — single task, not found
- `PATCH .../tasks/:taskId` — update fields, move between columns, WIP limit on target column
- `DELETE .../tasks/:taskId` — delete task, non-member blocked
- Story status derivation — story status auto-updates based on child task states
- `GET .../tasks/:taskId/activity` — returns combined comment + audit log
- `POST /api/projects/:id/tasks/:taskId/comments` — post comment
- `GET /api/projects/:id/tasks/:taskId/comments` — list comments
- `PATCH .../comments/:commentId` — edit own comment, edit others' comment blocked
- `DELETE .../comments/:commentId` — delete own comment, delete others' comment blocked
- `GET /api/notifications` — returns user notifications
- `PATCH /api/notifications/:notificationId` — mark as read

---

## Code Quality

### ESLint

Configured in `eslint.config.js` with the following enforced rules:

- `@typescript-eslint/no-explicit-any` — **error** (no `any` types allowed)
- `@typescript-eslint/no-unused-vars` — **error**

```bash
npm run lint
```

### Prettier

Configured in `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

```bash
npm run format
```