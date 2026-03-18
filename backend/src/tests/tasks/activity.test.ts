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
} from '../helpers/testHelpers';

let adminCookie: string;
let projectId: string, boardId: string, columnId: string, taskId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  const project = await seedProject();
  projectId = project.id;
  const board = await seedBoard(projectId); // Creates columns with orders 1-5
  boardId = board.id;

  // Use the existing "TO_DO" column (order 1)
  const column = await prisma.column.findFirst({
    where: { boardId, order: 1 },
  });
  columnId = column!.id;

  const task = await seedTask(columnId, admin.id, 'Activity Task');
  taskId = task.id;

  // Seed some initial activity
  await prisma.comment.create({
    data: { content: 'Test Comment', taskId, authorId: admin.id },
  });
  await prisma.auditLog.create({
    data: { action: 'TASK_CREATED', taskId, userId: admin.id },
  });

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /.../tasks/:taskId/activity', () => {
  it('1. Should return combined sorted activity', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}/activity`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // Ensure the sorting/type mapping works
    expect(res.body.some((item: any) => item.type === 'COMMENT')).toBe(true);
  });

  it('2. Should fail if task does not belong to the column', async () => {
    // Use order 10 so it doesn't conflict with orders 1-5
    const otherCol = await seedColumn(boardId, 'Other Column', 10);

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol.id}/tasks/${taskId}/activity`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task Not Found');
  });
});
