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
let nonMemberCookie: string;
let projectId: string;
let boardId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  const yash = await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  await seedUser(
    'Non Member',
    'nonmember@test.com',
    '_nonmember_',
    'nonmember123'
  );

  const project = await seedProject('Project1');
  projectId = project.id;
  await addMember(yash.id, project.id, 'MEMBER');

  const board = await seedBoard(project.id, 'Board1');
  boardId = board.id;

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
  nonMemberCookie = await loginUser('_nonmember_', 'nonmember123');
});

describe('GET /api/projects/:id/boards/:boardId', () => {
  it('1. Should fail if user is not a project member', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}`)
      .set('Cookie', nonMemberCookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('2. Should fail if board not found', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/invalidid`)
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('3. Should fail if board belongs to different project', async () => {
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');

    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/${otherBoard.id}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('4. Should return board for project member', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}`)
      .set('Cookie', memberCookie);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(boardId);
    expect(response.body.name).toBe('Board1');
  });
});

afterAll(async () => {
  await clearDatabase();
});
