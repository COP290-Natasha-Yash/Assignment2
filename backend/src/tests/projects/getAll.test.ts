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

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  await seedProject('Project1');
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('GET /api/projects', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return all projects for global admin', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('should return empty array for user with no memberships', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Cookie', userCookie);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  //One more test case that a project member can see all of his projects is in Members testing.
});

afterAll(async () => {
  await clearDatabase();
});
