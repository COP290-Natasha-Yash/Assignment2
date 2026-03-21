import request from 'supertest';
import app from '../../index';
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

  // seedBoard now creates 5 default columns automatically
  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards/:boardId/columns', () => {
  it('1. Should return all 5 default columns for the board', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(5);

    const names = response.body.map((c: { name: string }) => c.name);
    expect(names).toContain('TO_DO');
    expect(names).toContain('CLOSED');
  });

  it('2. Should fail with 404 if board does not belong to the project', async () => {
    const otherProject = await seedProject('Other Project');

    const response = await request(app)
      .get(`/api/projects/${otherProject.id}/boards/${boardId}/columns`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('3. Should return 404 for a non-existent board', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/invalid-board-id/columns`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
