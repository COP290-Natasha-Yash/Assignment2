import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import { clearDatabase, seedUser, loginUser } from '../helpers/testHelpers';

let userCookie: string;
let userId: string;

beforeAll(async () => {
  await clearDatabase();

  // Seed a test user
  const user = await seedUser(
    'Test User',
    'test@example.com',
    'test_user',
    'password123'
  );
  userId = user.id;

  // Log in to get the session cookie
  userCookie = await loginUser('test_user', 'password123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/users/me', () => {
  it("1. Should successfully fetch the logged-in user's profile", async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.name).toBe('Test User');
  });

  it('2. Should strictly exclude sensitive fields (password/tokens)', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', userCookie);

    // Verified fields
    expect(res.body).toHaveProperty('globalRole');

    // Forbidden fields
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  it('3. Should return 401 Unauthorized if no cookie is provided', async () => {
    const res = await request(app).get('/api/users/me');

    // This ensures your 'authenticate' middleware is active on this route
    expect(res.status).toBe(401);
  });

  it('4. Should return 404 if the user ID in the token no longer exists', async () => {
    // Manually delete the user from the DB
    await prisma.user.delete({ where: { id: userId } });

    const res = await request(app)
      .get('/api/users/me')
      .set('Cookie', userCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
