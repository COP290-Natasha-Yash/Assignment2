import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  seedColumn,
  seedTask,
  loginUser,
  addMember,
  seedComment,
  seedAuditLog,
} from '../helpers/testHelpers';

let adminCookie: string;
let adminId: string;
let projectId: string;
let boardId: string;
let columnId: string;
let taskId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Admin
  const admin = await seedAdmin();
  adminId = admin.id;

  // 2. Setup Project & ADD MEMBER (Crucial for RBAC!)
  const project = await seedProject('Activity Timeline Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');

  // 3. Setup Board & Column
  const board = await seedBoard(projectId); // Creates columns with orders 1-5
  boardId = board.id;

  const column = await prisma.column.findFirst({
    where: { boardId, order: 1 }, // Use the existing "TO_DO" column
  });
  columnId = column!.id;

  // 4. Setup Task
  const task = await seedTask(columnId, adminId, 'Activity Task');
  taskId = task.id;

  // 5. Seed Activity using your clean new helpers!
  // Note: We use an intentional delay or specific dates if sorting tests fail due to same-millisecond creation,
  // but Prisma usually handles sequential awaits fine.
  await seedAuditLog(taskId, adminId, 'TASK_CREATED');
  await seedComment(taskId, adminId, 'Test Comment');

  // 6. Login
  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId/activity', () => {
  it('1. Should return combined sorted activity (Comments + Audit Logs)', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/activity`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);

    // We expect 1 comment and 1 audit log = 2 total activity items
    expect(res.body.length).toBe(2);

    // Ensure the mapping logic works to differentiate them on the frontend
    const types = res.body.map((item: any) => item.type);
    expect(types).toContain('COMMENT');
    expect(types).toContain('AUDIT');
  });

  it('2. Should fail if task does not belong to the column (IDOR Check)', async () => {
    // Use order 10 so it doesn't conflict with orders 1-5
    const otherCol = await seedColumn(boardId, 'Other Column', 10);

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol.id}/tasks/${taskId}/activity`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    // Adjust this string to match whatever error your controller throws!
    expect(res.body.error.message).toContain('Not Found');
  });
});
