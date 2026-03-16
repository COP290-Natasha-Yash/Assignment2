import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../00_helpers/testHelpers';

let cookie: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  cookie = await loginUser('_yash_', 'yash123');
});

describe('POST /api/auth/logout', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app).post('/api/auth/logout').send();
    expect(response.status).toBe(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should logout successfully', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged Out Successfully');
  });

  it('should fail if already logged out', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('ALREADY_LOGGED_OUT');
  });

  it('should clear cookies on logout', async () => {
    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'yash@test.com',
      password: 'yash123',
    });
    const freshCookie = loginResponse.headers['set-cookie'];

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', freshCookie);

    const cookies = response.headers['set-cookie'];

    expect(cookies).toBeDefined();
    expect(cookies).toHaveLength(2);

    expect(cookies[0]).toContain('token=;');
    expect(cookies[1]).toContain('refreshToken=;');
  });

  it('should fail if user not found in database', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'lol user',
      email: 'loluser@test.com',
      password: 'loluser123',
      username: '_loluser_',
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: 'loluser@test.com',
      password: 'loluser123',
    });
    const deadCookie = loginResponse.headers['set-cookie'];

    await prisma.user.delete({ where: { email: 'loluser@test.com' } });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', deadCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
