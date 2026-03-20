import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let userCookie: string;
let targetUserId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Seed a Global Admin
  await seedAdmin();
  adminCookie = await loginUser('admin', 'admin123');

  // 2. Seed a Regular User (The one we will try to fetch)
  const targetUser = await seedUser(
    'Target User',
    'target@test.com',
    'target_u',
    'pass123'
  );
  targetUserId = targetUser.id;

  // 3. Seed another Regular User (To test unauthorized access)
  await seedUser('Unauthorized User', 'unauth@test.com', 'unauth_u', 'pass123');
  userCookie = await loginUser('unauth_u', 'pass123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/users/:userId', () => {
  it('1. Should allow a Global Admin to fetch a specific user profile', async () => {
    const res = await request(app)
      .get(`/api/users/${targetUserId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(targetUserId);
    expect(res.body.email).toBe('target@test.com');
  });

  it('2. Should strictly exclude sensitive fields like password/refreshToken', async () => {
    const res = await request(app)
      .get(`/api/users/${targetUserId}`)
      .set('Cookie', adminCookie);

    expect(res.body).toHaveProperty('name');
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  it("3. Should return 403 if a regular user tries to fetch someone else's profile", async () => {
    const res = await request(app)
      .get(`/api/users/${targetUserId}`)
      .set('Cookie', userCookie);

    // Restricted by your requireGlobalAdmin middleware
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('4. Should return 404 for a user ID that does not exist', async () => {
    const res = await request(app)
      .get('/api/users/cm00000000000000000000000')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('User Not Found');
  });
});
