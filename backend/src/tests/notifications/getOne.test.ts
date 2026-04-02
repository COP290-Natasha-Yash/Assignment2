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
let notificationId: string;

beforeAll(async () => {
  await clearDatabase();
  const user = await seedUser('Yash', 'yash@test.com', 'yash_v', 'pass123');
  userId = user.id;
  userCookie = await loginUser('yash_v', 'pass123');
});

beforeEach(async () => {
  // 1. Wipe persistent data manually
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();

  // 2. Setup Hierarchy
  const project = await seedProject('Notify Project');
  await addMember(userId, project.id, 'MEMBER');

  const board = await seedBoard(project.id, 'Main Board');

  let column = await prisma.column.findFirst({ where: { boardId: board.id } });

  const task = await seedTask(column!.id, userId, 'Detail Task');

  // 3. Create the target notification
  const note = await prisma.notification.create({
    data: {
      userId,
      message: 'Specific Alert Content',
      taskId: task.id,
      taskTitle: 'Detail Task',
    },
  });
  notificationId = note.id;
});

describe('GET /api/notifications/:notificationId', () => {
  it('1. Should successfully fetch a single notification by ID', async () => {
    const res = await request(app)
      .get(`/api/notifications/${notificationId}`)
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(notificationId);
    expect(res.body.message).toBe('Specific Alert Content');
    expect(res.body.taskTitle).toBe('Detail Task');
  });

  it('2. Should return 404 if the notification does not exist', async () => {
    const res = await request(app)
      .get('/api/notifications/cm00000000000000000000000')
      .set('Cookie', userCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Notification Not Found');
  });

  it("3. SECURITY CHECK: Should return 403 if a user tries to view someone else's notification", async () => {
    // Setup another user
    await seedUser('Stranger', 's@s.com', 'stranger', 'p123');
    const strangerCookie = await loginUser('stranger', 'p123');

    const res = await request(app)
      .get(`/api/notifications/${notificationId}`) // Trying to view Yash's notification
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Manage Your Own Notifications');
  });

  it('4. Should still return notification details even if the task is deleted (Persistence Check)', async () => {
    // 1. Delete the task (Notification stays due to SetNull design)
    const note = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    await prisma.task.delete({ where: { id: note!.taskId! } });

    // 2. Fetch the notification
    const res = await request(app)
      .get(`/api/notifications/${notificationId}`)
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe(null);
    expect(res.body.taskTitle).toBe('Detail Task'); // taskTitle saved the data
  });
});
