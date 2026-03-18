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

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  const project = await seedProject('Project1');
  projectId = project.id;

  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/boards/:boardId/columns/reorder', () => {
  it('1. Should successfully reorder columns', async () => {
    const columnsBefore = await prisma.column.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });

    // Create a payload that swaps the first two columns
    const payload = [
      { id: columnsBefore[0].id, order: 2 },
      { id: columnsBefore[1].id, order: 1 },
    ];

    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/reorder`)
      .send(payload)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Columns Reordered Successfully');

    // Verify the swap in the database
    const col1 = await prisma.column.findUnique({
      where: { id: columnsBefore[0].id },
    });
    const col2 = await prisma.column.findUnique({
      where: { id: columnsBefore[1].id },
    });

    expect(col1!.order).toBe(2);
    expect(col2!.order).toBe(1);
  });

  it('2. Should fail if payload is not an array', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/reorder`)
      .send({ id: '123', order: 1 }) // Not an array
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('3. Should return 404 for project/board mismatch', async () => {
    const otherProject = await seedProject('Other');

    const response = await request(app)
      .patch(
        `/api/projects/${otherProject.id}/boards/${boardId}/columns/reorder`
      )
      .send([])
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
  });
});
