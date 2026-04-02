import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  addMember,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let adminId: string;
let member1Id: string;
let member2Id: string;
let member1Username: string;
let member2Username: string;
let projectId: string;
let taskId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Users
  const admin = await seedAdmin();
  adminId = admin.id;

  const member1 = await prisma.user.create({
    data: {
      name: 'Alice',
      email: 'alice@example.com',
      password: 'hashed',
      username: 'alice123',
    },
  });
  member1Id = member1.id;
  member1Username = member1.username!;

  const member2 = await prisma.user.create({
    data: {
      name: 'Bob',
      email: 'bob@example.com',
      password: 'hashed',
      username: 'bob456',
    },
  });
  member2Id = member2.id;
  member2Username = member2.username!;

  // 2. Setup Project & Members
  const project = await seedProject('Comments Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');
  await addMember(member1Id, projectId, 'MEMBER');
  await addMember(member2Id, projectId, 'MEMBER');

  // 3. Setup Board, Column, and Task
  const board = await seedBoard(projectId);
  const column = await prisma.column.findFirst({
    where: { boardId: board.id },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Discussion Task',
      columnId: column!.id,
      reporterId: adminId,
      assigneeId: member1Id, // Alice is assigned
    },
  });
  taskId = task.id;

  adminCookie = await loginUser('admin', 'admin123');
});

beforeEach(async () => {
  // Clear notifications and audit logs before each test for clean assertions
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/projects/:id/tasks/:taskId/comments', () => {
  it('1. should successfully create a comment and log the audit event', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie)
      .send({ content: 'Initial review looks good.' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Initial review looks good.');
    expect(res.body.authorId).toBe(adminId);

    const log = await prisma.auditLog.findFirst({
      where: { taskId, action: 'COMMENT_ADDED' },
    });
    expect(log).toBeDefined();
    expect(log?.newValue).toBe('Initial review looks good.');
  });

  it('2. should return 400 if comment content is empty or whitespace', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie)
      .send({ content: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Comment is Required');
  });

  it('3. should return 404 if the task belongs to a different project (IDOR Protection)', async () => {
    // Create a decoy project and task
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id);
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });
    const otherTask = await prisma.task.create({
      data: {
        title: 'Other Task',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks/${otherTask.id}/comments`)
      .set('Cookie', adminCookie)
      .send({ content: 'Trying to comment on a task outside my project' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('Task NOT Found');
  });

  it('4. should notify the assignee when someone else comments', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie) // Admin comments on Alice's task
      .send({ content: 'Can you check this?' });

    const notification = await prisma.notification.findFirst({
      where: { userId: member1Id, taskId },
    });

    expect(notification).toBeDefined();
    expect(notification?.message).toContain('New Comment on Your task');
  });

  it('5. should NOT notify the assignee if the assignee is the one commenting (Self-Spam Protection)', async () => {
    // Re-assign task to Admin
    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: adminId },
    });

    await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie) // Admin comments on Admin's task
      .send({ content: 'Self note.' });

    const notification = await prisma.notification.findFirst({
      where: { userId: adminId, taskId },
    });

    expect(notification).toBeNull(); // Should be blocked

    // Revert assignee back to Alice for subsequent tests
    await prisma.task.update({
      where: { id: taskId },
      data: { assigneeId: member1Id },
    });
  });

  it('6. should parse @mentions and notify the mentioned users', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie)
      .send({
        content: `Hey @${member2Username}, can you help @${member1Username}?`,
      });

    // Verify Bob was notified
    const bobNotification = await prisma.notification.findFirst({
      where: { userId: member2Id, message: { contains: 'You Were Mentioned' } },
    });
    expect(bobNotification).toBeDefined();
  });

  it('7. should NOT notify the author if they @mention themselves', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie)
      .send({ content: `I'll handle this myself @admin.` }); // Assuming admin username is 'admin'

    const selfMentionNotification = await prisma.notification.findFirst({
      where: { userId: adminId, message: { contains: 'You Were Mentioned' } },
    });

    expect(selfMentionNotification).toBeNull();
  });

  it('8. should send dual notifications if the assignee is also explicitly @mentioned', async () => {
    await request(app)
      .post(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', adminCookie)
      .send({ content: `Hey @${member1Username}, this is your task.` }); // Alice is the assignee

    const notifications = await prisma.notification.findMany({
      where: { userId: member1Id, taskId },
    });

    expect(notifications.length).toBe(2);

    const messages = notifications.map((n) => n.message);
    expect(messages.some((m) => m.includes('Mentioned'))).toBe(true);
    expect(messages.some((m) => m.includes('New Comment'))).toBe(true);
  });
});
