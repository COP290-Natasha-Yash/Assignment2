import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  seedBoard,
  seedTask,
  seedComment,
  loginUser,
  addMember,
} from '../helpers/testHelpers';

let adminCookie: string;
let userCookie: string;
let adminId: string;
let userId: string;
let projectId: string;
let taskId: string;
let commentId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;
  adminCookie = await loginUser('admin', 'admin123');
  const user = await seedUser('Yash', 'yash@test.com', 'yash_v', 'pass123');
  userId = user.id;
  userCookie = await loginUser('yash_v', 'pass123');
});

beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Comment Test Project');
  projectId = project.id;
  await addMember(userId, projectId, 'MEMBER');
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Main Board');
  const column = await prisma.column.findFirst({
    where: { boardId: board.id },
    orderBy: { order: 'asc' },
  });

  const task = await seedTask(column!.id, userId, 'The Task');
  taskId = task.id;

  const comment = await seedComment(taskId, userId, 'Original Content');
  commentId = comment.id;
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/tasks/:taskId/comments/:commentId', () => {

  it('should successfully edit a comment and create an audit log', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: 'Updated Content' });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('Updated Content');

    const log = await prisma.auditLog.findFirst({
      where: { taskId, action: 'COMMENT_EDITED' },
    });
    expect(log).toBeDefined();
    expect(log?.oldValue).toBe('Original Content');
  });

  it('should fail if a user tries to edit someone else comment', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', adminCookie)
      .send({ content: 'I did not write this' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should return 404 if comment does not belong to the task', async () => {
    const col = await prisma.column.findFirst({ where: { board: { projectId } } });
    const otherTask = await seedTask(col!.id, userId, 'Wrong Task');

    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${otherTask.id}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: 'Wrong task' });

    expect(res.status).toBe(404);
  });

  it('should trigger notifications for @mentions', async () => {
    await seedUser('Target', 't@t.com', 'target_user', 'p123');

    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: 'Hey @target_user' });

    expect(res.status).toBe(200);

    const notification = await prisma.notification.findFirst({
      where: { message: { contains: 'target_user' } },
    });
    expect(notification).toBeDefined();
  });

  it('should notify task assignee when comment is edited', async () => {
    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: adminId },
    });

    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: 'Pinging the assignee' });

    expect(res.status).toBe(200);

    const notification = await prisma.notification.findFirst({
      where: { userId: adminId, message: { contains: 'Comment' } },
    });
    expect(notification).toBeDefined();
  });

  it('should return 400 for empty content', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 400 for whitespace content', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', userCookie)
      .send({ content: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('should return 404 if comment not found', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/comments/invalidcommentid`)
      .set('Cookie', userCookie)
      .send({ content: 'Updated' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

});