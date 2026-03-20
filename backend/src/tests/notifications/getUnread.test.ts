import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedUser,
  loginUser,
  seedProject,
  seedBoard,
  seedTask,
  addMember,
} from '../helpers/testHelpers';

let userCookie: string;
let userId: string;
let taskId: string;

beforeAll(async () => {
  await clearDatabase();
  const user = await seedUser('Yash', 'yash@test.com', 'yash_v', 'pass123');
  userId = user.id;
  userCookie = await loginUser('yash_v', 'pass123');
});

beforeEach(async () => {
  // Manual clear because notifications remain even if projects are deleted
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Unread Test Project');
  await addMember(userId, project.id, 'MEMBER');
  const board = await seedBoard(project.id, 'Board');

  let column = await prisma.column.findFirst({ where: { boardId: board.id } });

  const task = await seedTask(column!.id, userId, 'Unread Task');
  taskId = task.id;
});

describe('GET /api/notifications/unread', () => {
  it('1. Should only fetch notifications where read is FALSE', async () => {
    // Seed 1 Unread and 1 Read
    await prisma.notification.createMany({
      data: [
        {
          userId,
          message: 'I am unread',
          taskId,
          read: false,
          taskTitle: 'Task A',
        },
        {
          userId,
          message: 'I am read',
          taskId,
          read: true,
          taskTitle: 'Task B',
        },
      ],
    });

    const res = await request(app)
      .get('/api/notifications/unread')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].message).toBe('I am unread');
    expect(res.body[0].read).toBe(false);
  });

  it('2. Should return unread notifications in descending order (newest first)', async () => {
    await prisma.notification.create({
      data: {
        userId,
        message: 'Oldest',
        read: false,
        createdAt: new Date('2025-01-01'),
      },
    });
    await prisma.notification.create({
      data: {
        userId,
        message: 'Newest',
        read: false,
        createdAt: new Date('2026-01-01'),
      },
    });

    const res = await request(app)
      .get('/api/notifications/unread')
      .set('Cookie', userCookie);

    expect(res.body[0].message).toBe('Newest');
    expect(res.body[1].message).toBe('Oldest');
  });

  it('3. Should NOT show unread notifications belonging to other users', async () => {
    const stranger = await seedUser('Stranger', 's@s.com', 'stranger', 'p123');

    // Notification for the stranger
    await prisma.notification.create({
      data: { userId: stranger.id, message: 'Stranger Alert', read: false },
    });

    const res = await request(app)
      .get('/api/notifications/unread')
      .set('Cookie', userCookie); // Logged in as Yash

    expect(res.body.length).toBe(0);
  });

  it('4. Should still show unread notifications even after the task is deleted', async () => {
    await prisma.notification.create({
      data: {
        userId,
        message: 'Persistent Alert',
        read: false,
        taskId,
        taskTitle: 'Deleted Task',
      },
    });

    // Delete the task (Notification should survive with taskId = null)
    await prisma.task.delete({ where: { id: taskId } });

    const res = await request(app)
      .get('/api/notifications/unread')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].taskTitle).toBe('Deleted Task');
    expect(res.body[0].taskId).toBe(null);
  });
});
