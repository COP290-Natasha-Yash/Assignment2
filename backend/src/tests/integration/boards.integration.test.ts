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

async function setupProjectWithAdmin(suffix: string) {
  const admin = await registerAndLogin(
    `Admin ${suffix}`,
    `admin_${suffix}@example.com`,
    `admin_${suffix}`
  );
  await makeAdmin(`admin_${suffix}@example.com`);

  const projRes = await request(app)
    .post('/api/projects')
    .set('Cookie', admin.cookies)
    .send({ name: `Project ${suffix}` });

  const projectId = projRes.body.id;

  // Add admin as project admin
  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set('Cookie', admin.cookies)
    .send({ username: `admin_${suffix}`, role: 'ADMIN' });

  return { adminCookies: admin.cookies, projectId, adminUserId: admin.userId };
}

// ─── Boards ───────────────────────────────────────────────────────────────────

describe('Boards Integration Tests', () => {
  let adminCookies: string[];
  let memberCookies: string[];
  let projectId: string;
  let boardId: string;

  beforeEach(async () => {
    const setup = await setupProjectWithAdmin('board');
    adminCookies = setup.adminCookies;
    projectId = setup.projectId;

    const member = await registerAndLogin(
      'Board Member',
      'board_member@example.com',
      'board_member'
    );
    memberCookies = member.cookies;

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ username: 'board_member', role: 'MEMBER' });

    const boardRes = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Cookie', adminCookies)
      .send({ name: 'Test Board' });

    boardId = boardRes.body.id;
  });

  describe('POST /api/projects/:id/boards', () => {
    it('should create a board with default columns and return 201', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards`)
        .set('Cookie', adminCookies)
        .send({ name: 'Sprint 1' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Sprint 1');

      // Verify default columns were created
      const colRes = await request(app)
        .get(`/api/projects/${projectId}/boards/${res.body.id}/columns`)
        .set('Cookie', adminCookies);

      expect(colRes.body.length).toBe(5);
      const colNames = colRes.body.map((c: { name: string }) => c.name);
      expect(colNames).toContain('TO_DO');
      expect(colNames).toContain('CLOSED');
    });

    it('should return 400 if board name is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards`)
        .set('Cookie', adminCookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 403 if requester is not project admin', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards`)
        .set('Cookie', memberCookies)
        .send({ name: 'Unauthorized Board' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/projects/:id/boards', () => {
    it('should return all boards for the project', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((b: { id: string }) => b.id === boardId)).toBe(true);
    });
  });

  describe('GET /api/projects/:id/boards/:boardId', () => {
    it('should return a single board', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(boardId);
    });

    it('should return 404 for non-existent board', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards/fakeid`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/projects/:id/boards/:boardId', () => {
    it('should update board name', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/boards/${boardId}`)
        .set('Cookie', adminCookies)
        .send({ name: 'Updated Board' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Board');
    });

    it('should return 400 if name is empty', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/boards/${boardId}`)
        .set('Cookie', adminCookies)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id/boards/:boardId', () => {
    it('should delete a board', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/boards/${boardId}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);

      // Verify it's gone
      const getRes = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}`)
        .set('Cookie', adminCookies);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent board', async () => {
      const res = await request(app)
        .delete(`/api/projects/${projectId}/boards/fakeid`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
    });
  });
});

// ─── Columns ──────────────────────────────────────────────────────────────────

describe('Columns Integration Tests', () => {
  let adminCookies: string[];
  let memberCookies: string[];
  let projectId: string;
  let boardId: string;
  let columnId: string;

  beforeEach(async () => {
    const setup = await setupProjectWithAdmin('col');
    adminCookies = setup.adminCookies;
    projectId = setup.projectId;

    const member = await registerAndLogin(
      'Col Member',
      'col_member@example.com',
      'col_member'
    );
    memberCookies = member.cookies;

    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookies)
      .send({ username: 'col_member', role: 'MEMBER' });

    const boardRes = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .set('Cookie', adminCookies)
      .send({ name: 'Col Test Board' });

    boardId = boardRes.body.id;

    // Get the first column (TO_DO)
    const colRes = await request(app)
      .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
      .set('Cookie', adminCookies);

    columnId = colRes.body[0].id;
  });

  describe('POST /api/projects/:id/boards/:boardId/columns', () => {
    it('should create a new column', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies)
        .send({ name: 'TESTING' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('TESTING');
    });

    it('should create column with WIP limit', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies)
        .send({ name: 'WIP_COL', wipLimit: 3 });

      expect(res.status).toBe(201);
      expect(res.body.wipLimit).toBe(3);
    });

    it('should return 400 if column name is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 403 if requester is not admin', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', memberCookies)
        .send({ name: 'UNAUTHORIZED' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/projects/:id/boards/:boardId/columns', () => {
    it('should return all columns sorted by order', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5); // default 5 columns

      // Verify sorted by order
      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i].order).toBeGreaterThanOrEqual(res.body[i - 1].order);
      }
    });
  });

  describe('GET /api/projects/:id/boards/:boardId/columns/:columnId', () => {
    it('should return a single column', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(columnId);
    });

    it('should return 404 for non-existent column', async () => {
      const res = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}/columns/fakeid`)
        .set('Cookie', adminCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/projects/:id/boards/:boardId/columns/:columnId', () => {
    it('should update column name', async () => {
      const res = await request(app)
        .patch(
          `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`
        )
        .set('Cookie', adminCookies)
        .send({ name: 'BACKLOG' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('BACKLOG');
    });

    it('should update WIP limit', async () => {
      const res = await request(app)
        .patch(
          `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`
        )
        .set('Cookie', adminCookies)
        .send({ wipLimit: 5 });

      expect(res.status).toBe(200);
      expect(res.body.wipLimit).toBe(5);
    });

    it('should return 400 if WIP limit is less than current task count', async () => {
      // Create 3 tasks in the column first
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(
            `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
          )
          .set('Cookie', adminCookies)
          .send({ title: `Task ${i}`, type: 'TASK', priority: 'MEDIUM' });
      }

      const res = await request(app)
        .patch(
          `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`
        )
        .set('Cookie', adminCookies)
        .send({ wipLimit: 1 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id/boards/:boardId/columns/:columnId', () => {
    it('should delete a non-CLOSED column', async () => {
      // Create a custom column to delete
      const newColRes = await request(app)
        .post(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies)
        .send({ name: 'TO_DELETE' });

      const res = await request(app)
        .delete(
          `/api/projects/${projectId}/boards/${boardId}/columns/${newColRes.body.id}`
        )
        .set('Cookie', adminCookies);

      expect(res.status).toBe(200);
    });

    it('should return 403 when trying to delete CLOSED column', async () => {
      // Get CLOSED column
      const colsRes = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies);

      const closedCol = colsRes.body.find(
        (c: { order: number }) => c.order === 99
      );

      const res = await request(app)
        .delete(
          `/api/projects/${projectId}/boards/${boardId}/columns/${closedCol.id}`
        )
        .set('Cookie', adminCookies);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/projects/:id/boards/:boardId/columns/reorder', () => {
    it('should reorder columns successfully', async () => {
      const colsRes = await request(app)
        .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
        .set('Cookie', adminCookies);

      const regularCols = colsRes.body.filter(
        (c: { order: number }) => c.order !== 99
      );
      // Reverse the order
      const reordered = regularCols.map((col: { id: string }, i: number) => ({
        id: col.id,
        order: regularCols.length - i,
      }));

      const res = await request(app)
        .patch(`/api/projects/${projectId}/boards/${boardId}/columns/reorder`)
        .set('Cookie', adminCookies)
        .send(reordered);

      expect(res.status).toBe(200);
    });

    it('should return 400 if columns array is not provided', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/boards/${boardId}/columns/reorder`)
        .set('Cookie', adminCookies)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should return 403 if trying to reorder CLOSED column', async () => {
      const res = await request(app)
        .patch(`/api/projects/${projectId}/boards/${boardId}/columns/reorder`)
        .set('Cookie', adminCookies)
        .send([{ id: 'someid', order: 99 }]);

      expect(res.status).toBe(403);
    });
  });
});
