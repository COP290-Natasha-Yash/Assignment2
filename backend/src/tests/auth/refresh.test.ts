import request from 'supertest';
import app from '../../index';
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
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  cookie = await loginUser('_yash_', 'yash123');
});

describe('POST /api/auth/refresh', () => {
  it('1. should refresh token successfully and set cookie', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.body.message).toBe('Token Refreshed Successfully');
  });

  it('2. should fail if refresh token is missing or invalid', async () => {
    const missingResponse = await request(app).post('/api/auth/refresh');
    expect(missingResponse.status).toBe(400);

    const invalidResponse = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=invalid_token_here');
    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body.error.code).toBe('UNAUTHORIZED');
  });
});

afterAll(async () => {
  await clearDatabase();
});
