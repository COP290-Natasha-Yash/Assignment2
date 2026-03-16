import request from 'supertest';
import app from '../../index';

import { clearDatabase, seedAdmin, seedUser } from '../00_helpers/testHelpers';

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  await seedUser('Natasha', 'natasha@test.com', '_natasha_', 'natasha123');
});

describe('POST /api/auth/login', () => {
  it('should login successfully with email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'yash@test.com', password: 'yash123' });

    expect(response.status).toBe(200);
  });

  it('should login successfully with username', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: '_natasha_', password: 'natasha123' });

    expect(response.status).toBe(200);
  });

  it('should fail if password not provided', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: '_yash_' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if both username and email not provided', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'yash123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail with wrong password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: '_yash_',
      password: 'yash12345',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail with non-existent email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'natasha12@test.com',
      password: 'natasha123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail with non-existent username', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: '_yash12_',
      password: 'yash123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should set cookie on login', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: '_yash_',
      password: 'yash123',
    });

    expect(response.headers['set-cookie']).toHaveLength(2);
  });

  it('should return correct user fields', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'yash@test.com',
      password: 'yash123',
    });

    expect(response.body.user).toBeDefined();
    expect(response.body.user.id).toBeDefined();
    expect(response.body.user.email).toBe('yash@test.com');
    expect(response.body.user.password).toBeUndefined();
  });

  it('should login with both email and username provided', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'yash@test.com',
      username: '_yash_',
      password: 'yash123',
    });

    expect(response.status).toBe(200);
  });

  it('should fail with object as password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'yash@test.com',
        password: { $gt: '' },
      });

    expect(response.status).toBe(400);
  });
});

afterAll(async () => {
  await clearDatabase();
});
