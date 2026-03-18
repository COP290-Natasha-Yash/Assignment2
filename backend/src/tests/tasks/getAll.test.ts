import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  addMember,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let projectId: string;
let boardId: string;
let columnId: string;
let adminId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;

  const project = await seedProject('List Tasks Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Main Board');
  boardId = board.id;

  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  await prisma.task.createMany({
    data: [
      { title: 'Task 1', columnId, reporterId: adminId, status: column!.name },
      { title: 'Task 2', columnId, reporterId: adminId, status: column!.name },
    ],
  });

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards/:boardId/columns/:columnId/tasks', () => {
  it('1. Should successfully fetch all tasks in a column', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0].columnId).toBe(columnId);
  });

  it('2. Should return 404 if the column does not belong to the board', async () => {
    const otherBoard = await seedBoard(projectId, 'Other Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol!.id}/tasks`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Column Not Found');
  });

  it('3. Should return 404 if the board does not belong to the project', async () => {
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id, 'Project B Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${otherBoard.id}/columns/${otherCol!.id}/tasks`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Board Not Found');
  });

  it('4. Should return an empty array if the column has no tasks', async () => {
    const emptyCol = await prisma.column.create({
      data: { name: 'Empty', order: 10, boardId },
    });

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${emptyCol.id}/tasks`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
