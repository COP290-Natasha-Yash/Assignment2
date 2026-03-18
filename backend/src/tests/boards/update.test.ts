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
  await addMember(yash.id, project.id, 'MEMBER');

  const board = await seedBoard(project.id, 'Board1');
  boardId = board.id;

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
});

describe('PATCH /api/projects/:id/boards/:boardId', () => {
  it('1. Should fail if project member but not admin', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}`)
      .send({ name: 'Updated Board' })
      .set('Cookie', memberCookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('2. Should fail if name is missing', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}`)
      .send({})
      .set('Cookie', adminCookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('3. Should fail if board not found', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/invalidid`)
      .send({ name: 'Updated Board' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('4. Should fail if board belongs to different project', async () => {
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');

    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${otherBoard.id}`)
      .send({ name: 'Hacked Board' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('5. Should update board successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}`)
      .send({ name: 'Updated Board' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Board');
  });
});

afterAll(async () => {
  await clearDatabase();
});
