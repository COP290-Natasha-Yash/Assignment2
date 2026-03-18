import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../helpers/testHelpers';

let cookie: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', 'yash', 'yash123');
  cookie = await loginUser('yash', 'yash123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/auth/logout', () => {
  it('1. Should logout successfully and clear cookies', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Logged Out Successfully');

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toContain('token=;');
    expect(cookies[1]).toContain('refreshToken=;');
  });

  it('2. Should fail if already logged out or no token provided', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('3. Should fail if session user no longer exists', async () => {
    await seedUser('Ghost', 'ghost@test.com', 'ghost', 'ghost123');
    const ghostCookie = await loginUser('ghost', 'ghost123');

    await prisma.user.delete({ where: { email: 'ghost@test.com' } });

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', ghostCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
