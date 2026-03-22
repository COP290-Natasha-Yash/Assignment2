import request from 'supertest';
import app from '../../../src/index';
import { prisma } from '../../../src/prisma';
import { setupEach } from '../setup';

beforeEach(async () => {
  await setupEach();
});


// ─── Helpers ──────────────────────────────────────────────────────────────────

async function registerAndLogin(
  name: string,
  email: string,
  username: string,
  password = 'password123'
) {
  const res = await request(app).post('/api/auth/register').send({
    name,
    email,
    username,
    password,
  });
  return {
    cookies: res.headers['set-cookie'] as unknown as string[],
    userId: res.body.user?.id as string,
  };
}

async function makeAdmin(email: string) {
  await prisma.user.update({
    where: { email },
    data: { globalRole: 'GLOBAL_ADMIN' },
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

describe('Projects Integration Tests', () => {
  let adminCookies: string[];
  let memberCookies: string[];
  let memberId: string;
  let projectId: string;

  beforeEach(async () => {
    const admin = await registerAndLogin(
      'Admin User',
      'admin_proj@example.com',
      'admin_proj'
    );
    adminCookies = admin.cookies;
    await makeAdmin('admin_proj@example.com');

    const member = await registerAndLogin(
      'Member User',
      'member_proj@example.com',
      'member_proj'
    );
    memberCookies = member.cookies;
    memberId = member.userId;

    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookies)
      .send({ name: 'Test Project', description: 'A test project' });

    projectId = projRes.body.id;
  });

  describe('POST /api/projects', () => {
    it('should create a project as global admin and return 201', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', adminCookies)
        .send({ name: 'New Project' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('New Project');
    });

    it('should return 403 if non-admin tries to create a project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', memberCookies)
        .send({ name: 'Unauthorized Project' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Cookie', adminCookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: 'No Auth' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects', () => {
    it('should return all projects for global admin', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return only member projects for regular user', async () => {
      // Add member to project
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'member_proj', role: 'MEMBER' });

      const res = await request(app)
        .get('/api/projects')
        .set('Cookie', memberCookies);

      expect(res.status).toBe(200);
      expect(res.body.some((p: { id: string }) => p.id === projectId)).toBe(true);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return a project for a member', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'member_proj', role: 'MEMBER' });

      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', memberCookies);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(projectId);
    });

    it('should return 403 if user is not a member', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Cookie', memberCookies);

      expect(res.status).toBe(403);
    });

    it('should return 404 if project does not exist', async () => {
      const res = await request(app)
        .get('/api/projects/nonexistentid')
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/projects/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'member_proj', role: 'ADMIN' });
    });

    it('should update project name as admin', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Project' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Project');
    });

    it('should return 400 if name is empty', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}`)
        .set('Cookie', adminCookies)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/projects/:id/archive', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'member_proj', role: 'ADMIN' });
    });

    it('should archive a project', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: true });

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(true);
    });

    it('should unarchive a project', async () => {
      await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: true });

      const res = await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: false });

      expect(res.status).toBe(200);
      expect(res.body.archived).toBe(false);
    });

    it('should return 400 if already archived', async () => {
      await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: true });

      const res = await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: true });

      expect(res.status).toBe(400);
    });

    it('should return 400 if boolean is not provided', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/archive`)
        .set('Cookie', adminCookies)
        .send({ archived: 'yes' });

      expect(res.status).toBe(400);
    });
  });
});

// ─── Members ──────────────────────────────────────────────────────────────────

describe('Members Integration Tests', () => {
  let adminCookies: string[];
  let memberCookies: string[];
  let memberUserId: string;
  let projectId: string;

  beforeEach(async () => {
    const admin = await registerAndLogin(
      'Admin Member',
      'admin_member@example.com',
      'admin_member'
    );
    adminCookies = admin.cookies;
    await makeAdmin('admin_member@example.com');

    const member = await registerAndLogin(
      'Regular Member',
      'regular_member@example.com',
      'regular_member'
    );
    memberCookies = member.cookies;
    memberUserId = member.userId;

    const projRes = await request(app)
      .post('/api/projects')
      .set('Cookie', adminCookies)
      .send({ name: 'Member Test Project' });

    projectId = projRes.body.id;

    // Add admin as project admin
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ username: 'admin_member', role: 'ADMIN' });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add a member to a project', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should return 400 if user is already a member', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if role is invalid', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'SUPERUSER' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if user does not exist', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'ghostuser', role: 'MEMBER' });

      expect(res.status).toBe(404);
    });

    it('should return 403 if requester is not project admin', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      const res = await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', memberCookies)
        .send({ username: 'admin_member', role: 'VIEWER' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/projects/:id/members', () => {
    it('should return all members of a project', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      const res = await request(app)
        .get(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/projects/:id/members/:userId', () => {
    it('should update a member role', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${memberUserId}`)
        .set('Cookie', adminCookies)
        .send({ role: 'VIEWER' });

      expect(res.status).toBe(200);
      expect(res.body.role).toBe('VIEWER');
    });

    it('should return 400 for invalid role', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/${memberUserId}`)
        .set('Cookie', adminCookies)
        .send({ role: 'BOSS' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if member does not exist in project', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/members/nonexistentid`)
        .set('Cookie', adminCookies)
        .send({ role: 'VIEWER' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id/members/:userId', () => {
    it('should remove a member from a project', async () => {
      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', adminCookies)
        .send({ username: 'regular_member', role: 'MEMBER' });

      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/${memberUserId}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
    });

    it('should return 404 if member is not in project', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/members/nonexistentid`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
    });
  });
});
