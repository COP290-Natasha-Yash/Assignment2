import request from 'supertest';
import app from '../index';
import { prisma } from '../prisma';

let cookie: string;

beforeAll(async () => {
  await prisma.user.deleteMany();
  
  // register
  await request(app).post('/api/auth/register').send({
    name: 'Yash',
    email: 'yash@test.com',
    password: '123456',
    username: 'yash'
  });

  // make global admin
  await prisma.user.updateMany({
    where: { email: 'yash@test.com' },
    data: { globalRole: 'GLOBAL_ADMIN' }
  });

  // login and save cookie
  const response = await request(app).post('/api/auth/login').send({
    email: 'yash@test.com',
    password: '123456'
  });
  cookie = response.headers['set-cookie'];
});

afterAll(async () => {
  await prisma.user.deleteMany();
});

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash',
      email: 'yash@test.com',
      password: '123456',
      username: 'yash'
    });
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('yash@test.com');
  });

  it('should fail if email already exists', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Yash',
      email: 'yash@test.com',
      password: '123456',
      username: 'yash'
    });
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash2',
      email: 'yash@test.com',
      password: '123456',
      username: 'yash2'
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('should fail if fields are missing', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'yash@test.com'
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});