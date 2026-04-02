import request from 'supertest';
import app from '../../../src/index';
import { prisma } from '../../../src/prisma';
import { setupEach } from '../setup';

beforeEach(async () => {
  await setupEach();
});

describe('Auth Integration Tests', () => {
  // ─── Register ────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Test User',
        email: 'testuser@example.com',
        username: 'testuser',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.email).toBe('testuser@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'missing@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Email',
        email: 'notanemail',
        username: 'bademail',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should return 400 if email is already taken', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Dupe User',
        email: 'dupe@example.com',
        username: 'dupeuser1',
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'Dupe User 2',
        email: 'dupe@example.com',
        username: 'dupeuser2',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('should return 400 if username is already taken', async () => {
      await request(app).post('/api/auth/register').send({
        name: 'User A',
        email: 'usera@example.com',
        username: 'sameusername',
        password: 'password123',
      });

      const res = await request(app).post('/api/auth/register').send({
        name: 'User B',
        email: 'userb@example.com',
        username: 'sameusername',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('USERNAME_TAKEN');
    });

    it('should return 400 if username contains @', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Bad Username',
        email: 'badusername@example.com',
        username: 'bad@username',
        password: 'password123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('should set httpOnly cookies on successful register', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Cookie User',
        email: 'cookieuser@example.com',
        username: 'cookieuser',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('token='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refreshToken='))).toBe(
        true
      );
    });
  });

  // ─── Login ────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        name: 'Login User',
        email: 'loginuser@example.com',
        username: 'loginuser',
        password: 'password123',
      });
    });

    it('should login with email and return 200', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'loginuser@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
    });

    it('should login with username and return 200', async () => {
      const res = await request(app).post('/api/auth/login').send({
        username: 'loginuser',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.user).toHaveProperty('id');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'loginuser@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);
    });

    it('should return 400 if neither email nor username provided', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'password123',
      });

      expect(res.status).toBe(400);
    });

    it('should set httpOnly cookies on successful login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'loginuser@example.com',
        password: 'password123',
      });

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies.some((c: string) => c.startsWith('token='))).toBe(true);
    });
  });

  // ─── Logout ───────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout successfully and return 200', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Logout User',
        email: 'logoutuser@example.com',
        username: 'logoutuser',
        password: 'password123',
      });

      const cookies = registerRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged Out Successfully');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('should return 400 if already logged out', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Double Logout',
        email: 'doublelogout@example.com',
        username: 'doublelogout',
        password: 'password123',
      });

      const cookies = registerRes.headers['set-cookie'];

      await request(app).post('/api/auth/logout').set('Cookie', cookies);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ALREADY_LOGGED_OUT');
    });
  });

  // ─── Refresh ──────────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should refresh the access token and return 200', async () => {
      const registerRes = await request(app).post('/api/auth/register').send({
        name: 'Refresh User',
        email: 'refreshuser@example.com',
        username: 'refreshuser',
        password: 'password123',
      });

      const cookies = registerRes.headers['set-cookie'];

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Token Refreshed Successfully');
    });

    it('should return 400 if no refresh token provided', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.status).toBe(400);
    });

    it('should return 401 if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=invalidtoken']);

      expect(res.status).toBe(401);
    });
  });
});
