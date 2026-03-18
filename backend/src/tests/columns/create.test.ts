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

let adminCookie: string;
let memberCookie: string;
let projectId: string;
let boardId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();

  const yash = await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const project = await seedProject('Project1');
  projectId = project.id;

  await addMember(yash.id, projectId, 'MEMBER'); // Yash is a member, not an admin
  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/projects/:id/boards/:boardId/columns', () => {
  it('1. Should create a column successfully and auto-calculate order', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .send({ name: 'Testing Column', wipLimit: 5 })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Testing Column');
    expect(response.body.wipLimit).toBe(5);
    // Since seedBoard usually creates 5 default columns, this should be 6
    expect(response.body.order).toBeGreaterThan(0);
  });

  it('2. Should fail if user is not a project admin', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .send({ name: 'Hack Column' })
      .set('Cookie', memberCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('3. Should fail if name is invalid or missing', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .send({ name: '   ' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('4. Should fail if board does not belong to the project', async () => {
    const otherProject = await seedProject('Other');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');

    const response = await request(app)
      .post(`/api/projects/${projectId}/boards/${otherBoard.id}/columns`)
      .send({ name: 'Invalid Board Column' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('5. Should fail if board is not found', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards/invalid-id/columns`)
      .send({ name: 'Ghost Column' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
  });
});
