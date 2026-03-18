import request from 'supertest';
import app from '../../index';
import { clearDatabase, seedAdmin } from '../helpers/testHelpers';

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
});

describe('POST /api/auth/register', () => {
  it('1. Should fail if required fields are missing or invalid', async () => {
    const missingField = await request(app).post('/api/auth/register').send({
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_',
    });
    expect(missingField.status).toBe(400);

    const emptyName = await request(app).post('/api/auth/register').send({
      name: '',
      email: 'empty@test.com',
      password: 'empty123',
      username: '_empty_',
    });
    expect(emptyName.status).toBe(400);

    const objectPassword = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test',
        email: 'object@test.com',
        password: { $gt: '' },
        username: '_object_',
      });
    expect(objectPassword.status).toBe(400);
  });

  it('2. Should register successfully, set cookies, and return safe user fields', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash',
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_',
    });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toHaveLength(2);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe('yash@test.com');
    expect(response.body.user.password).toBeUndefined();
  });

  it('3. Should fail if email or username already exists', async () => {
    const duplicateEmail = await request(app).post('/api/auth/register').send({
      name: 'Yash 2',
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_2',
    });
    expect(duplicateEmail.status).toBe(400);
    expect(duplicateEmail.body.error.code).toBe('EMAIL_TAKEN');

    const duplicateUsername = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Yash 2',
        email: 'yash2@test.com',
        password: 'yash123',
        username: '_yash_',
      });
    expect(duplicateUsername.status).toBe(400);
    expect(duplicateUsername.body.error.code).toBe('USERNAME_TAKEN');
  });
});

afterAll(async () => {
  await clearDatabase();
});
