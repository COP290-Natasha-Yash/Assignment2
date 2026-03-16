import request from 'supertest';
import app from '../../index';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  loginUser,
} from '../00_helpers/testHelpers';

let adminCookie: string;
let userCookie: string;
let projectId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const project = await seedProject('Project1');
  projectId = project.id;
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('GET /api/projects/:id', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app).get(`/api/projects/${projectId}`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not a project member', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should return project for global admin', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(projectId);
    expect(response.body.name).toBe('Project1');
  });

  it('should fail if project not found', async () => {
    const response = await request(app)
      .get('/api/projects/noproject')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should return 403 for user not project member accessing non-existent project', async () => {
    const response = await request(app)
      .get('/api/projects/noproject')
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
