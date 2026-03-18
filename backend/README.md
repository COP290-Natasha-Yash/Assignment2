# Task Board Backend

A RESTful backend API for a Jira-inspired Kanban task tracking system, built for COP290 Assignment 2 at IIT Delhi written by author Yash Vaishnav.

---

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: SQLite (via Prisma ORM)
- **Authentication**: JWT (HTTP-only cookies)
- **Testing**: Jest + Supertest
- **Linting**: ESLint + Prettier (Google TypeScript Style Guide)

---

## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create a `.env` file in the `backend` folder:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secret_key_here"
```

### Database Setup

```bash
npx prisma migrate dev
npx prisma generate
```

### Seed Default Admin

```bash
npm run seed
```

This creates a default Global Admin:
- **Username**: `admin`
- **Email**: `admin@taskboard.com`
- **Password**: `admin123`

### Run Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## Running Tests

```bash
npm test
```

Tests use a separate `test.db` database — your real data is never touched.

---

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Seeds default admin user
│   └── migrations/         # Migration history
├── src/
│   ├── index.ts            # App setup and route registration
│   ├── server.ts           # Server entry point
│   ├── prisma.ts           # Prisma client setup
│   ├── constants.ts        # Shared constants (roles, types, priorities)
│   ├── middleware/
│   │   ├── auth.ts         # JWT authentication middleware
│   │   └── roles.ts        # Role-based access control
│   ├── routes/
│   │   ├── auth/           # Register, Login, Logout, Refresh
│   │   ├── projects/       # Project CRUD + Archive
│   │   ├── boards/         # Board CRUD
│   │   ├── columns/        # Column CRUD + Reorder
│   │   ├── tasks/          # Task CRUD + Move
│   │   ├── comments/       # Comment CRUD
│   │   ├── notifications/  # Notifications
│   │   ├── members/        # Project membership management
│   │   └── users/          # User profile management
│   ├── utils/
│   │   ├── auditLog.ts              # Audit log helper
│   │   ├── createNotification.ts    # Notification helper
│   │   └── getExpectedStoryStatus.ts # Story status derivation
│   └── tests/
│       ├── setup.ts        # Test DB setup
│       ├── teardown.ts     # Test DB cleanup
│       ├── env.ts          # Test environment variables
│       ├── helpers/
│       │   └── testHelpers.ts  # Reusable test utilities
│       ├── auth/           # Auth tests
│       ├── projects/       # Project tests
│       ├── boards/         # Board tests
│       ├── members/        # Member tests
│       ├── columns/        # Column tests
│       ├── tasks/          # Task tests
│       └── comments/       # Comment tests
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (sets HTTP-only cookies) |
| POST | `/api/auth/logout` | Logout (clears cookies) |
| POST | `/api/auth/refresh` | Refresh access token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:userId` | Get user by ID |
| PATCH | `/api/users/me` | Update own profile |
| PATCH | `/api/users/:userId/role` | Change global role (Global Admin only) |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project (Global Admin only) |
| GET | `/api/projects` | Get all projects |
| GET | `/api/projects/:id` | Get project by ID |
| PATCH | `/api/projects/:id` | Update project |
| PATCH | `/api/projects/:id/archive` | Archive project |

### Project Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/members` | Add member to project |
| GET | `/api/projects/:id/members` | Get all project members |
| PATCH | `/api/projects/:id/members/:userId` | Update member role |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/boards` | Create board (auto-creates 5 default columns) |
| GET | `/api/projects/:id/boards` | Get all boards |
| GET | `/api/projects/:id/boards/:boardId` | Get board by ID |
| PATCH | `/api/projects/:id/boards/:boardId` | Update board |
| DELETE | `/api/projects/:id/boards/:boardId` | Delete board |

### Columns
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/boards/:boardId/columns` | Create column |
| GET | `/api/projects/:id/boards/:boardId/columns` | Get all columns |
| GET | `/api/projects/:id/boards/:boardId/columns/:columnId` | Get column |
| PATCH | `/api/projects/:id/boards/:boardId/columns/:columnId` | Update column |
| DELETE | `/api/projects/:id/boards/:boardId/columns/:columnId` | Delete column |
| PATCH | `/api/projects/:id/boards/:boardId/columns/reorder` | Reorder columns |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks` | Create task |
| GET | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks` | Get all tasks |
| GET | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId` | Get task |
| PATCH | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId` | Update task |
| DELETE | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId` | Delete task |
| PATCH | `/api/projects/:id/boards/:boardId/tasks/:taskId/move` | Move task to another column |
| GET | `/api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId/activity` | Get task activity timeline |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks/:taskId/comments` | Add comment |
| GET | `/api/tasks/:taskId/comments` | Get all comments |
| GET | `/api/tasks/:taskId/comments/:commentId` | Get comment |
| PATCH | `/api/tasks/:taskId/comments/:commentId` | Edit comment |
| DELETE | `/api/tasks/:taskId/comments/:commentId` | Delete comment |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get all notifications |
| PATCH | `/api/notifications/:notificationId` | Mark notification as read |

---

## Role-Based Access Control

### Global Roles
| Role | Permissions |
|------|-------------|
| `GLOBAL_ADMIN` | Create projects, manage all users, assign project roles |
| `USER` | Default role for all registered users |

### Project-Level Roles
| Role | Permissions |
|------|-------------|
| `ADMIN` | Full access to project settings, manage members, modify board workflows |
| `MEMBER` | Create and edit tasks, participate in projects |
| `VIEWER` | Read-only access |

> Global Admins bypass all project-level role checks.

---

## Key Features

### WIP Limits
Columns can have a Work In Progress (WIP) limit. If a column is full, task moves are **blocked** — not just warned.

### Status Transitions
Tasks can only move to **adjacent columns** (order ± 1). The `CLOSED` column is an exception and can be reached from any column.

### Story Status Derivation
Story task status is automatically derived from its children using column order. The story's status reflects the minimum progress column among all children.

### Audit Trail
The following events are logged for each task:
- Status changes (old → new)
- Assignee changes (old → new)
- Comments added, edited, deleted

### Notifications
In-app notifications are triggered for:
- Task assigned to user
- Task status changed
- Comment added to task
- User mentioned in comment (`@username`)

---

## Error Response Format

All errors follow this consistent format:

```json
{
  "error": {
    "message": "Human readable message",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `EMAIL_TAKEN` | 400 | Email already registered |
| `USERNAME_TAKEN` | 400 | Username already taken |
| `WIP_LIMIT_REACHED` | 400 | Column WIP limit exceeded |
| `INVALID_TRANSITION` | 400 | Invalid column transition |
| `ALREADY_LOGGED_OUT` | 400 | User already logged out |

---

## Default Columns

Every new board is automatically created with 5 default columns:

| Column | Order | Description |
|--------|-------|-------------|
| `TO_DO` | 1 | Work not yet started |
| `IN_PROGRESS` | 2 | Work in progress |
| `IN_REVIEW` | 3 | Under review |
| `DONE` | 4 | Completed work |
| `CLOSED` | 99 | Closed without completion |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run test suite |
| `npm run seed` | Seed default Global Admin |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |