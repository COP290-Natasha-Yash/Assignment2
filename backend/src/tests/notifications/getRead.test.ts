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
  // Manual wipe for persistent notification records
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Archive Project');
  await addMember(userId, project.id, 'MEMBER');
  const board = await seedBoard(project.id, 'Main Board');

  let column = await prisma.column.findFirst({ where: { boardId: board.id } });

  const task = await seedTask(column!.id, userId, 'Archived Task');
  taskId = task.id;
});

describe('GET /api/notifications/read (Read/Archived Only)', () => {
  it('1. Should only fetch notifications where read is TRUE', async () => {
    // Seed 1 Read and 1 Unread
    await prisma.notification.createMany({
      data: [
        {
          userId,
          message: 'I am read',
          taskId,
          read: true,
          taskTitle: 'Task 1',
        },
        {
          userId,
          message: 'I am unread',
          taskId,
          read: false,
          taskTitle: 'Task 2',
        },
      ],
    });

    const res = await request(app)
      .get('/api/notifications/read')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].message).toBe('I am read');
    expect(res.body[0].read).toBe(true);
  });

  it('2. Should return read notifications in newest-first order', async () => {
    await prisma.notification.create({
      data: {
        userId,
        message: 'Old',
        read: true,
        createdAt: new Date('2020-01-01'),
      },
    });
    await prisma.notification.create({
      data: {
        userId,
        message: 'New',
        read: true,
        createdAt: new Date('2026-01-01'),
      },
    });

    const res = await request(app)
      .get('/api/notifications/read')
      .set('Cookie', userCookie);

    expect(res.body[0].message).toBe('New');
    expect(res.body[1].message).toBe('Old');
  });

  it('3. Should NOT show read notifications belonging to other users', async () => {
    await seedUser('Other', 'other@test.com', 'other_u', 'p123');
    const otherCookie = await loginUser('other_u', 'p123');

    await prisma.notification.create({
      data: { userId, message: 'Yash Read Notification', read: true },
    });

    const res = await request(app)
      .get('/api/notifications/read')
      .set('Cookie', otherCookie);

    expect(res.body.length).toBe(0);
  });

  it('4. Should show read notifications even after the task is deleted', async () => {
    await prisma.notification.create({
      data: {
        userId,
        message: 'History Item',
        read: true,
        taskId,
        taskTitle: 'Ghost Task',
      },
    });

    // Delete the task
    await prisma.task.delete({ where: { id: taskId } });

    const res = await request(app)
      .get('/api/notifications/read')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].taskTitle).toBe('Ghost Task');
    expect(res.body[0].taskId).toBe(null);
  });
});
