import request from 'supertest';
import app from '../../index';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  loginUser,
} from '../helpers/testHelpers';

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

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects', () => {
  it('1. Should return all projects for global admin and empty for non-members', async () => {
    const adminResponse = await request(app)
      .get('/api/projects')
      .set('Cookie', adminCookie);
    expect(adminResponse.status).toBe(200);
    expect(Array.isArray(adminResponse.body)).toBe(true);
    expect(adminResponse.body.length).toBeGreaterThan(0);

    const userResponse = await request(app)
      .get('/api/projects')
      .set('Cookie', userCookie);
    expect(userResponse.status).toBe(200);
    expect(userResponse.body).toEqual([]);
  });
});
