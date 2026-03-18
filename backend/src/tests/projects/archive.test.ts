import request from 'supertest';
import app from '../../index';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  loginUser,
  seedUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let projectId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  const project = await seedProject('Archive Test Project');
  projectId = project.id;
  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/archive', () => {
  it('1. Should archive project successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.archived).toBe(true);
  });

  it('2. Should fail for invalid project or duplicate archive', async () => {
    const notFound = await request(app)
      .patch('/api/projects/noproject/archive')
      .set('Cookie', adminCookie);
    expect(notFound.status).toBe(404);

    const duplicate = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);
    expect(duplicate.status).toBe(400);
  });

  it('3. Should fail if user is not a project member', async () => {
    await seedUser(
      'Stranger',
      'stranger@test.com',
      '_stranger_',
      'stranger123'
    );
    const strangerCookie = await loginUser('_stranger_', 'stranger123');

    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', strangerCookie);

    expect(response.status).toBe(403);
  });
});
