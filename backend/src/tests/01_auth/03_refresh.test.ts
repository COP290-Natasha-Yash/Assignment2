import request from 'supertest';
import app from '../../index';

let cookie: string;

beforeAll(async () => {
  const response = await request(app).post('/api/auth/login').send({
    email: 'yash@test.com',
    password: 'yash123',
  });
  cookie = response.headers['set-cookie'];
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
