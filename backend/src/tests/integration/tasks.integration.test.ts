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
    name, email, username, password,
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

interface BoardSetup {
  adminCookies: string[];
  memberCookies: string[];
  memberUserId: string;
  projectId: string;
  boardId: string;
  todoColumnId: string;
  inProgressColumnId: string;
  closedColumnId: string;
}

async function setupBoard(suffix: string): Promise<BoardSetup> {
  const admin = await registerAndLogin(
    `Admin ${suffix}`,
    `admin_task_${suffix}@example.com`,
    `admin_task_${suffix}`
  );
  await makeAdmin(`admin_task_${suffix}@example.com`);

  const member = await registerAndLogin(
    `Member ${suffix}`,
    `member_task_${suffix}@example.com`,
    `member_task_${suffix}`
  );

  const projRes = await request(app)
    .post('/api/projects')
    .set('Cookie', admin.cookies)
    .send({ name: `Task Project ${suffix}` });

  const projectId = projRes.body.id;

  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set('Cookie', admin.cookies)
    .send({ username: `admin_task_${suffix}`, role: 'ADMIN' });

  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set('Cookie', admin.cookies)
    .send({ username: `member_task_${suffix}`, role: 'MEMBER' });

  const boardRes = await request(app)
    .post(`/api/projects/${projectId}/boards`)
    .set('Cookie', admin.cookies)
    .send({ name: `Board ${suffix}` });

  const boardId = boardRes.body.id;

  const colsRes = await request(app)
    .get(`/api/projects/${projectId}/boards/${boardId}/columns`)
    .set('Cookie', admin.cookies);

  const todoColumnId = colsRes.body.find((c: { name: string }) => c.name === 'TO_DO').id;
  const inProgressColumnId = colsRes.body.find((c: { name: string }) => c.name === 'IN_PROGRESS').id;
  const closedColumnId = colsRes.body.find((c: { order: number }) => c.order === 99).id;

  return {
    adminCookies: admin.cookies,
    memberCookies: member.cookies,
    memberUserId: member.userId,
    projectId,
    boardId,
    todoColumnId,
    inProgressColumnId,
    closedColumnId,
  };
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

describe('Tasks Integration Tests', () => {
  let setup: BoardSetup;

  beforeEach(async () => {
    setup = await setupBoard('tasks');
  });

  describe('POST /api/projects/:id/boards/:boardId/columns/:columnId/tasks', () => {
    it('should create a task and return 201', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'My Task', type: 'TASK', priority: 'MEDIUM' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('My Task');
      expect(res.body.status).toBe('TO_DO');
      expect(res.body.type).toBe('TASK');
    });

    it('should create a BUG task', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'My Bug', type: 'BUG', priority: 'HIGH' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('BUG');
    });

    it('should create a STORY task', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'My Story', type: 'STORY', priority: 'LOW' });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('STORY');
    });

    it('should return 400 if title is missing', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ type: 'TASK', priority: 'MEDIUM' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if priority is invalid', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Bad Priority', type: 'TASK', priority: 'EXTREME' });

      expect(res.status).toBe(400);
    });

    it('should return 400 if STORY has a parentId', async () => {
      const storyRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Parent Story', type: 'STORY', priority: 'MEDIUM' });

      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Bad Story',
          type: 'STORY',
          priority: 'MEDIUM',
          parentId: storyRes.body.id,
        });

      expect(res.status).toBe(400);
    });

    it('should create a child task linked to a story', async () => {
      const storyRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Parent Story', type: 'STORY', priority: 'MEDIUM' });

      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Child Task',
          type: 'TASK',
          priority: 'MEDIUM',
          parentId: storyRes.body.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.parentId).toBe(storyRes.body.id);
    });

    it('should enforce WIP limit on task creation', async () => {
      // Set WIP limit to 1
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}`)
        .set('Cookie', setup.adminCookies)
        .send({ wipLimit: 1 });

      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Task 1', type: 'TASK', priority: 'MEDIUM' });

      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Task 2', type: 'TASK', priority: 'MEDIUM' });

      expect(res.status).toBe(400);
    });

    it('should assign a task to a member and send notification', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Assigned Task',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body.assigneeId).toBe(setup.memberUserId);

      // Verify notification was created
      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      expect(notifRes.body.some((n: { message: string }) =>
        n.message.includes('Assigned Task')
      )).toBe(true);
    });
  });

  describe('GET /api/projects/:id/boards/:boardId/columns/:columnId/tasks', () => {
    it('should return all tasks in a column', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Task A', type: 'TASK', priority: 'MEDIUM' });

      const res = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
    it('should return a single task', async () => {
      const taskRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Get Me', type: 'TASK', priority: 'MEDIUM' });

      const res = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskRes.body.id}`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(taskRes.body.id);
    });

    it('should return 404 for non-existent task', async () => {
      const res = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/fakeid`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
    let taskId: string;

    beforeEach(async () => {
      const taskRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Update Me', type: 'TASK', priority: 'MEDIUM' });

      taskId = taskRes.body.id;
    });

    it('should update task title', async () => {
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
    });

    it('should move task to next column by updating status', async () => {
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.columnId).toBe(setup.inProgressColumnId);
    });

    it('should return 400 for invalid status transition (skipping columns)', async () => {
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'DONE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TRANSITION');
    });

    it('should allow moving directly to CLOSED from any column', async () => {
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'CLOSED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CLOSED');
    });

    it('should enforce WIP limit when moving tasks', async () => {
      // Set WIP limit of 1 on IN_PROGRESS
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.inProgressColumnId}`)
        .set('Cookie', setup.adminCookies)
        .send({ wipLimit: 1 });

      // Fill IN_PROGRESS
      const task1Res = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Filler Task', type: 'TASK', priority: 'MEDIUM' });

      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${task1Res.body.id}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'IN_PROGRESS' });

      // Try to move another task to IN_PROGRESS — should fail
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WIP_LIMIT_REACHED');
    });

    it('should update assignee and create audit log', async () => {
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ assigneeId: setup.memberUserId });

      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBe(setup.memberUserId);

      // Verify audit log was created
      const activityRes = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}/activity`)
        .set('Cookie', setup.adminCookies);

      const auditEntry = activityRes.body.find(
        (a: { type: string; action: string }) =>
          a.type === 'AUDIT' && a.action === 'ASSIGNEE_CHANGED'
      );
      expect(auditEntry).toBeDefined();
    });

    it('should clear assignee when set to null', async () => {
      // First assign
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ assigneeId: setup.memberUserId });

      // Then clear
      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ assigneeId: null });

      expect(res.status).toBe(200);
      expect(res.body.assigneeId).toBeNull();
    });
  });

  describe('DELETE /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
    it('should delete a task and return 200', async () => {
      const taskRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Delete Me', type: 'TASK', priority: 'MEDIUM' });

      const res = await request(app)
        .delete(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskRes.body.id}`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);

      const getRes = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskRes.body.id}`)
        .set('Cookie', setup.adminCookies);

      expect(getRes.status).toBe(404);
    });

    it('should return 403 if requester is a VIEWER', async () => {
      const viewer = await registerAndLogin(
        'Viewer User',
        `viewer_task@example.com`,
        `viewer_task`
      );

      await request(app)
        .post(`/api/projects/${setup.projectId}/members`)
        .set('Cookie', setup.adminCookies)
        .send({ username: 'viewer_task', role: 'VIEWER' });

      const taskRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Protected Task', type: 'TASK', priority: 'MEDIUM' });

      const res = await request(app)
        .delete(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskRes.body.id}`)
        .set('Cookie', viewer.cookies);

      expect(res.status).toBe(403);
    });
  });

  describe('Story status derivation', () => {
    it('should derive story status when child task moves', async () => {
      const storyRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Parent Story', type: 'STORY', priority: 'MEDIUM' });

      const storyId = storyRes.body.id;

      const childRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Child Task',
          type: 'TASK',
          priority: 'MEDIUM',
          parentId: storyId,
        });

      // Move child to IN_PROGRESS
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${childRes.body.id}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'IN_PROGRESS' });

      // Story status should now be IN_PROGRESS
      const storyGetRes = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.inProgressColumnId}/tasks/${storyId}`)
        .set('Cookie', setup.adminCookies);

      expect(storyGetRes.status).toBe(200);
      expect(storyGetRes.body.status).toBe('IN_PROGRESS');
    });
  });

  describe('GET .../tasks/:taskId/activity', () => {
    it('should return combined comments and audit logs', async () => {
      const taskRes = await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({ title: 'Activity Task', type: 'TASK', priority: 'MEDIUM' });

      const taskId = taskRes.body.id;

      // Post a comment
      await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Hello activity' });

      // Move task to generate audit log
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ status: 'IN_PROGRESS' });

      const res = await request(app)
        .get(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.inProgressColumnId}/tasks/${taskId}/activity`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.some((a: { type: string }) => a.type === 'COMMENT')).toBe(true);
      expect(res.body.some((a: { type: string }) => a.type === 'AUDIT')).toBe(true);
    });
  });
});

// ─── Comments ─────────────────────────────────────────────────────────────────

describe('Comments Integration Tests', () => {
  let setup: BoardSetup;
  let taskId: string;

  beforeEach(async () => {
    setup = await setupBoard('comments');

    const taskRes = await request(app)
      .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
      .set('Cookie', setup.adminCookies)
      .send({ title: 'Comment Task', type: 'TASK', priority: 'MEDIUM' });

    taskId = taskRes.body.id;
  });

  describe('POST /api/projects/:id/tasks/:taskId/comments', () => {
    it('should create a comment and return 201', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'This is a comment' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('This is a comment');
      expect(res.body.author).toHaveProperty('id');
    });

    it('should return 400 if content is empty', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: '   ' });

      expect(res.status).toBe(400);
    });

    it('should return 404 if task does not exist', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/fakeid/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Ghost comment' });

      expect(res.status).toBe(404);
    });

    it('should notify assignee when comment is added', async () => {
      // Assign task to member
      await request(app)
        .patch(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks/${taskId}`)
        .set('Cookie', setup.adminCookies)
        .send({ assigneeId: setup.memberUserId });

      await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Hey assignee!' });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      expect(notifRes.body.some((n: { message: string }) =>
        n.message.toLowerCase().includes('comment')
      )).toBe(true);
    });

    it('should notify mentioned user in comment', async () => {
      const res = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: `Hey @member_task_comments check this out!` });

      expect(res.status).toBe(201);

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      expect(notifRes.body.some((n: { message: string }) =>
        n.message.toLowerCase().includes('mention')
      )).toBe(true);
    });
  });

  describe('GET /api/projects/:id/tasks/:taskId/comments', () => {
    it('should return all comments for a task', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Comment 1' });

      await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Comment 2' });

      const res = await request(app)
        .get(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });
  });

  describe('PATCH /api/projects/:id/tasks/:taskId/comments/:commentId', () => {
    it('should update own comment', async () => {
      const commentRes = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Original' });

      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/tasks/${taskId}/comments/${commentRes.body.id}`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Updated');
    });

    it('should return 403 if trying to edit someone else comment', async () => {
      const commentRes = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Admin comment' });

      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/tasks/${taskId}/comments/${commentRes.body.id}`)
        .set('Cookie', setup.memberCookies)
        .send({ content: 'Stolen edit' });

      expect(res.status).toBe(403);
    });

    it('should return 400 if content is empty', async () => {
      const commentRes = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'To be emptied' });

      const res = await request(app)
        .patch(`/api/projects/${setup.projectId}/tasks/${taskId}/comments/${commentRes.body.id}`)
        .set('Cookie', setup.adminCookies)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id/tasks/:taskId/comments/:commentId', () => {
    it('should delete own comment', async () => {
      const commentRes = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Delete me' });

      const res = await request(app)
        .delete(`/api/projects/${setup.projectId}/tasks/${taskId}/comments/${commentRes.body.id}`)
        .set('Cookie', setup.adminCookies);

      expect(res.status).toBe(200);
    });

    it('should return 403 if trying to delete someone else comment', async () => {
      const commentRes = await request(app)
        .post(`/api/projects/${setup.projectId}/tasks/${taskId}/comments`)
        .set('Cookie', setup.adminCookies)
        .send({ content: 'Admin only' });

      const res = await request(app)
        .delete(`/api/projects/${setup.projectId}/tasks/${taskId}/comments/${commentRes.body.id}`)
        .set('Cookie', setup.memberCookies);

      expect(res.status).toBe(403);
    });
  });
});

// ─── Notifications ────────────────────────────────────────────────────────────

describe('Notifications Integration Tests', () => {
  let setup: BoardSetup;

  beforeEach(async () => {
    setup = await setupBoard('notif');
  });

  describe('GET /api/notifications', () => {
    it('should return all notifications for the current user', async () => {
      // Create a task assigned to member to trigger a notification
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Notif Task',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      const res = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:notificationId', () => {
    it('should mark notification as read', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Read Me',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      const notifId = notifRes.body[0].id;

      const res = await request(app)
        .patch(`/api/notifications/${notifId}`)
        .set('Cookie', setup.memberCookies)
        .send({ bool: true });

      expect(res.status).toBe(200);
      expect(res.body.read).toBe(true);
    });

    it('should mark notification as unread', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Unread Me',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      const notifId = notifRes.body[0].id;

      await request(app)
        .patch(`/api/notifications/${notifId}`)
        .set('Cookie', setup.memberCookies)
        .send({ bool: true });

      const res = await request(app)
        .patch(`/api/notifications/${notifId}`)
        .set('Cookie', setup.memberCookies)
        .send({ bool: false });

      expect(res.status).toBe(200);
      expect(res.body.read).toBe(false);
    });

    it('should return 403 if trying to update someone else notification', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Steal Notif',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      const notifId = notifRes.body[0].id;

      const res = await request(app)
        .patch(`/api/notifications/${notifId}`)
        .set('Cookie', setup.adminCookies)
        .send({ bool: true });

      expect(res.status).toBe(403);
    });

    it('should return 400 if bool is not a boolean', async () => {
      await request(app)
        .post(`/api/projects/${setup.projectId}/boards/${setup.boardId}/columns/${setup.todoColumnId}/tasks`)
        .set('Cookie', setup.adminCookies)
        .send({
          title: 'Bool Task',
          type: 'TASK',
          priority: 'MEDIUM',
          assigneeId: setup.memberUserId,
        });

      const notifRes = await request(app)
        .get('/api/notifications')
        .set('Cookie', setup.memberCookies);

      const notifId = notifRes.body[0].id;

      const res = await request(app)
        .patch(`/api/notifications/${notifId}`)
        .set('Cookie', setup.memberCookies)
        .send({ bool: 'yes' });

      expect(res.status).toBe(400);
    });
  });
});
