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
  // Manual wipe because notifications survive project deletions in your design
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Inbox Project');
  await addMember(userId, project.id, 'MEMBER');
  const board = await seedBoard(project.id, 'Main Board');

  // Ensure a column exists to seed the task
  let column = await prisma.column.findFirst({ where: { boardId: board.id } });

  const task = await seedTask(column!.id, userId, 'Inbox Task');
  taskId = task.id;
});

describe('GET /api/notifications (General Inbox)', () => {
  it('1. Should fetch both READ and UNREAD notifications for the user', async () => {
    await prisma.notification.createMany({
      data: [
        { userId, message: 'Unread Alert', read: false, taskTitle: 'Task A' },
        { userId, message: 'Read Alert', read: true, taskTitle: 'Task B' },
      ],
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    // Verify we have a mix of statuses
    const statuses = res.body.map((n: { read: boolean }) => n.read);
    expect(statuses).toContain(true);
    expect(statuses).toContain(false);
  });

  it('2. Should return all notifications in descending order (newest first)', async () => {
    await prisma.notification.create({
      data: { userId, message: 'Oldest', createdAt: new Date('2026-01-01') },
    });
    await prisma.notification.create({
      data: { userId, message: 'Newest', createdAt: new Date('2026-03-20') },
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userCookie);

    expect(res.body[0].message).toBe('Newest');
    expect(res.body[1].message).toBe('Oldest');
  });

  it('3. Should NOT leak notifications from other users', async () => {
    const stranger = await seedUser('Stranger', 's@s.com', 'stranger', 'p123');
    await prisma.notification.create({
      data: { userId: stranger.id, message: 'Stranger Secret' },
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userCookie);

    expect(res.body.length).toBe(0);
  });

  it('4. Should return an empty array if the user has no history', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('5. Persistence Check: Should show notifications even if the task is gone', async () => {
    await prisma.notification.create({
      data: {
        userId,
        message: 'Task-linked Alert',
        taskId,
        taskTitle: 'Delete Me',
      },
    });

    await prisma.task.delete({ where: { id: taskId } });

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].taskTitle).toBe('Delete Me');
    expect(res.body[0].taskId).toBe(null); // Relation set to null, record remains
  });
});
