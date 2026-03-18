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
let emptyProjectId: string;

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

  // 1. Setup a project with a board
  const project = await seedProject('Project1');
  projectId = project.id;
  await addMember(yash.id, project.id, 'MEMBER');
  await seedBoard(project.id, 'Board1');

  // 2. Setup a brand new project with NO boards
  const emptyProject = await seedProject('Empty Project');
  emptyProjectId = emptyProject.id;
  await addMember(yash.id, emptyProject.id, 'MEMBER');

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
  nonMemberCookie = await loginUser('_nonmember_', 'nonmember123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/boards', () => {
  it('1. Should fail if user is not a project member', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Cookie', nonMemberCookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('2. Should fail if project not found', async () => {
    const response = await request(app)
      .get('/api/projects/invalidid/boards')
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('3. Should return all boards for project member', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}/boards`)
      .set('Cookie', memberCookie);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].name).toBe('Board1');
  });

  it('4. Should return empty array if project has no boards', async () => {
    const response = await request(app)
      .get(`/api/projects/${emptyProjectId}/boards`)
      .set('Cookie', memberCookie);
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
