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
  // Wipe in order. Notifications first because they are don't get removed!
  await prisma.notification.deleteMany();
  await prisma.project.deleteMany();

  // Setup Hierarchy
  const project = await seedProject('Notify Project');
  await addMember(userId, project.id, 'MEMBER');

  const board = await seedBoard(project.id, 'Main Board');

  let column = await prisma.column.findFirst({ where: { boardId: board.id } });

  const task = await seedTask(column!.id, userId, 'Test Task');

  // 4. Create the target notification
  const note = await prisma.notification.create({
    data: { userId, message: 'Unread Alert', taskId: task.id, read: false },
  });
  notificationId = note.id;
});

describe('PATCH /api/notifications/:notificationId', () => {
  it('1. Should successfully mark a notification as read', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);

    // Verify DB state
    const updated = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    expect(updated?.read).toBe(true);
  });

  it('2. Should return 404 for a non-existent notification ID', async () => {
    const res = await request(app)
      .patch('/api/notifications/cm00000000000000000000000')
      .set('Cookie', userCookie);

    expect(res.status).toBe(404);
  });

  it("3. Should return 403 if a user tries to mark someone else's notification as read", async () => {
    // Setup a different user
    await seedUser('Stranger', 's@s.com', 'stranger', 'p123');
    const strangerCookie = await loginUser('stranger', 'p123');

    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('Manage Your Own Notifications');
  });
});
