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
  addMember,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let adminId: string;
let projectId: string;
let boardId: string;
let columnId: string;
let taskId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;

  const project = await seedProject('Detail View Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Main Board');
  boardId = board.id;

  // Get the first column seeded by seedBoard
  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  const task = await seedTask(columnId, adminId, 'Detailed Task');
  taskId = task.id;

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
  it('1. Should successfully fetch a specific task by ID', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${taskId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(taskId);
    expect(res.body.title).toBe('Detailed Task');
  });

  it('2. Should return 404 if the task is accessed through the wrong column', async () => {
    const otherCol = await seedColumn(boardId, 'Wrong Column Path', 999);

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol.id}/tasks/${taskId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task Not Found'); // Make sure your controller uses this exact casing
  });

  it('3. Should return 404 if the task does not exist', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/non-existent-id`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('4. Should return 404 if the board ID in the path does not match the project', async () => {
    // Create a different project and board to test unauthorized board access
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${otherBoard.id}/columns/${columnId}/tasks/${taskId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Board Not Found');
  });
});
