import request from 'supertest';
import app from '../../index';

import { seedTestDb } from '../seed';

beforeAll(async () => {
  await seedTestDb();
});



describe('POST /api/auth/register', () => {
  it('should fail if fields(here:name) is missing', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if fields(here:email) is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Yash', password: 'yash123', username: '_yash_' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if fields(here:password) is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Yash', email: 'yash@test.com', username: '_yash_' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if fields(here:username) is missing', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Yash', email: 'yash@test.com', password: 'yash123' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should register successfully', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash',
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_'
    });

    expect(response.status).toBe(201);
  });

  it('should fail if email already exists', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash 2',
      email: 'yash@test.com',
      password: 'yash123',
      username: '_yash_2'
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('should fail if username already exists', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Yash 2',
      email: 'yash2@test.com',
      password: 'yash123',
      username: '_yash_',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('should not return password in response', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Natasha',
      email: 'natasha@test.com',
      password: 'natasha123',
      username: '_natasha_',
    });

    expect(response.body.password).toBe(undefined);
  });

  it('should register project admin', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Project Admin',
      email: 'projectadmin@test.com',
      password: 'projectadmin123',
      username: '_projectadmin_',
    });

    expect(response.status).toBe(201);
  });

  it('should register project member', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Project Member',
      email: 'projectmember@test.com',
      password: 'projectmember123',
      username: '_projectmember_',
    });

    expect(response.status).toBe(201);
  });

  it('should register project viewer', async () => {
    const response = await request(app).post('/api/auth/register').send({
      name: 'Project Viewer',
      email: 'projectviewer@test.com',
      password: 'projectviewer123',
      username: '_projectviewer_',
    });

    expect(response.status).toBe(201);
  });
});
