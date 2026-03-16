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
  const project = await seedProject('Archive Test Project');
  projectId = project.id;
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('PATCH /api/projects/:id/archive', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app).patch(
      `/api/projects/${projectId}/archive`
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not a project member', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if project not found', async () => {
    const response = await request(app)
      .patch('/api/projects/noproject/archive')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should fail for non-member accessing non-existent project', async () => {
    const response = await request(app)
      .patch('/api/projects/noproject/archive')
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should archive project successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.archived).toBe(true);
  });

  it('should fail if project already archived', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});

afterAll(async () => {
  await clearDatabase();
});
