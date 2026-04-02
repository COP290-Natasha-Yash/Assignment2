import request from 'supertest';
import app from '../../index';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let userCookie: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Seed a Global Admin
  await seedAdmin(); // Assumed to create a user with globalRole: 'ADMIN'
  adminCookie = await loginUser('admin', 'admin123');

  // 2. Seed a Regular User
  await seedUser('Standard User', 'user@test.com', 'standard_u', 'pass123');
  userCookie = await loginUser('standard_u', 'pass123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/users', () => {
  it('1. Should allow a Global Admin to fetch all users', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // Should see at least the 2 users we seeded
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('2. Should strictly exclude sensitive fields from the response', async () => {
    const res = await request(app).get('/api/users').set('Cookie', adminCookie);

    const firstUser = res.body[0];

    // Whitelisted fields
    expect(firstUser).toHaveProperty('id');
    expect(firstUser).toHaveProperty('email');
    expect(firstUser).toHaveProperty('globalRole');

    // Sensitive blacklisted fields
    expect(firstUser).not.toHaveProperty('password');
    expect(firstUser).not.toHaveProperty('refreshToken');
  });

  it('3. Should forbid a regular user from fetching the user list', async () => {
    const res = await request(app).get('/api/users').set('Cookie', userCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. Should return 401 for unauthenticated requests', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(401);
  });
});
