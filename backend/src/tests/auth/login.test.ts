import request from 'supertest';
import app from '../../index';
import { clearDatabase, seedUser } from '../helpers/testHelpers';

beforeAll(async () => {
  await clearDatabase();
  // Password is 'yash123' (will be hashed by seedUser)
  await seedUser('Yash Vaishnav', 'yash@test.com', '_yash_', 'yash123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/auth/login', () => {
  it('1. Should login successfully using ONLY email', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'yash@test.com', password: 'yash123' });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('_yash_');
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('2. Should login successfully using ONLY username', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: '_yash_', password: 'yash123' });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('yash@test.com');
  });

  it('3. Should login successfully using BOTH email and username', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'yash@test.com',
      username: '_yash_',
      password: 'yash123',
    });

    expect(response.status).toBe(200);
  });

  it('4. Should fail if email and username belong to different users', async () => {
    // Seed a second user
    await seedUser('Other', 'other@test.com', '_other_', 'other123');

    const response = await request(app).post('/api/auth/login').send({
      email: 'yash@test.com',
      username: '_other_', // This username doesn't match yash's email
      password: 'yash123',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe('Invalid Credentials');
  });

  it('5. Should fail with incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: '_yash_', password: 'wrongpassword' });

    expect(response.status).toBe(401);
  });

  it('6. Should fail if required fields are missing', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ password: 'yash123' }); // Missing both email and username

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});
