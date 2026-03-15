import request from 'supertest';
import app from '../../index';

describe('POST /api/auth/login', () => {
  it('should login successfully with email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'yash@test.com', password: 'yash123' });

    expect(response.status).toBe(200);
  });

  it('should login successfully with username', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: '_natasha_', password: 'natasha123' });

    expect(response.status).toBe(200);
  });

  it('should fail if password not provided', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: '_yashvaishnav_' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if username already exists', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Yash Vaishna',
        email: 'yashvai@test.com',
        password: 'yashv123',
        username: '_yashvaishnav_',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('should not return password in response', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Natasha',
        email: 'natasha@test.com',
        password: 'natasha123',
        username: '_natasha_',
      });

    expect(response.body.password).toBe(undefined);
  });

  it('should register project admin', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Project Admin',
        email: 'projectadmin@test.com',
        password: 'projectadmin123',
        username: '_projectadmin_',
      });

    expect(response.status).toBe(201);
  });

  it('should register project member', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Project Member',
        email: 'projectmember@test.com',
        password: 'projectmember123',
        username: '_projectmember_',
      });

    expect(response.status).toBe(201);
  });

  it('should register project viewer', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Project Viewer',
        email: 'projectviewer@test.com',
        password: 'projectviewer123',
        username: '_projectviewer_',
      });

    expect(response.status).toBe(201);
  });
});
