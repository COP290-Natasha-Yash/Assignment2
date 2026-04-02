import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let projectId: string;
let boardId: string;
let columnId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  const project = await seedProject('Project1');
  projectId = project.id;

  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards/:boardId/columns/:columnId', () => {
  it('1. Should return the specific column successfully', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(columnId);
    expect(response.body.boardId).toBe(boardId);
  });

  it('2. Should fail for hierarchy mismatches or non-existent resources', async () => {
    // 1. Project-Board Mismatch
    const otherProject = await seedProject('Other');
    const res1 = await request(app)
      .get(
        `/api/projects/${otherProject.id}/boards/${boardId}/columns/${columnId}`
      )
      .set('Cookie', adminCookie);
    expect(res1.status).toBe(404);

    // 2. Board-Column Mismatch
    const otherBoard = await seedBoard(projectId, 'Other Board');
    const res2 = await request(app)
      .get(
        `/api/projects/${projectId}/boards/${otherBoard.id}/columns/${columnId}`
      )
      .set('Cookie', adminCookie);
    expect(res2.status).toBe(404);

    // 3. Invalid Column ID
    const res3 = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}/columns/fake-id`)
      .set('Cookie', adminCookie);
    expect(res3.status).toBe(404);
  });
});
