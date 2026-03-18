import request from 'supertest';
import app from '../../index';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  seedBoard,
  addMember,
  loginUser,
} from '../helpers/testHelpers';
import { prisma } from '../../prisma';

let adminCookie: string;
let memberCookie: string;
let projectId: string;
let boardId: string;
let columnId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();

  const yash = await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const project = await seedProject('Project1');
  projectId = project.id;

  await addMember(yash.id, projectId, 'MEMBER');
  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  // Grab a column created by the seedBoard side-effect
  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('DELETE /api/projects/:id/boards/:boardId/columns/:columnId', () => {
  it('1. Should delete column successfully as global admin', async () => {
    const response = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`
      )
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Column Deleted Successfully');

    // Verify database removal
    const check = await prisma.column.findUnique({ where: { id: columnId } });
    expect(check).toBeNull();
  });

  it('2. Should fail if user is not project admin', async () => {
    // Create a new column to try and delete
    const tempCol = await prisma.column.create({
      data: { name: 'Temp', boardId, order: 10 },
    });

    const response = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${tempCol.id}`
      )
      .set('Cookie', memberCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('3. Should fail if resource hierarchy is invalid (404 checks)', async () => {
    const otherProject = await seedProject('Other');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    // 1. Board doesn't belong to Project
    const res1 = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${otherBoard.id}/columns/${otherCol!.id}`
      )
      .set('Cookie', adminCookie);
    expect(res1.status).toBe(404);

    // 2. Column doesn't belong to Board
    const res2 = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol!.id}`
      )
      .set('Cookie', adminCookie);
    expect(res2.status).toBe(404);

    // 3. Fake IDs
    const res3 = await request(app)
      .delete(`/api/projects/${projectId}/boards/${boardId}/columns/fake-id`)
      .set('Cookie', adminCookie);
    expect(res3.status).toBe(404);
  });
});
