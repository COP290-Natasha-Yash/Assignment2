import request from 'supertest';
import app from '../../index';

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

describe('POST /api/auth/refresh', () => {
  it('should refresh token successfully', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toHaveLength(1);
    expect(response.body.message).toBe('Token Refreshed Successfully');
  });

  it('should fail if no refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', '');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail with invalid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=random');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });
});

afterAll(async () => {
  await clearDatabase();
});
