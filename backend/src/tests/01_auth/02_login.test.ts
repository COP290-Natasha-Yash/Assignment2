import request from 'supertest';
import app from '../../index';


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
      password: 'yash12345',
      username: '_yash_',
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
      password: 'projectadmin123',
      username: '_projectadmin12_',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should set cookie on login', async () => {
    const response = await request(app).post('/api/auth/login').send({
      password: 'projectviewer123',
      username: '_projectviewer_',
    });

    expect(response.headers['set-cookie']).toBeDefined;
  });
});
