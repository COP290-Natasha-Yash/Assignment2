import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import { clearDatabase, seedUser, loginUser } from '../helpers/testHelpers';

let userCookie: string;
let strangerCookie: string;
let userId: string;
let notificationId: string;

beforeAll(async () => {
  await clearDatabase();

  // Create the owner of the notification
  const user = await seedUser('Yash', 'yash@test.com', 'yash_v', 'pass123');
  userId = user.id;
  userCookie = await loginUser('yash_v', 'pass123');

  // Create a stranger to test unauthorized access
  const stranger = await seedUser(
    'Stranger',
    's@test.com',
    'stranger',
    'pass123'
  );
  strangerCookie = await loginUser('stranger', 'pass123');
});

beforeEach(async () => {
  // Clean up notifications before each test to ensure a blank slate
  await prisma.notification.deleteMany();

  // Seed a default UNREAD notification
  const note = await prisma.notification.create({
    data: {
      userId,
      message: 'Toggle Test Notification',
      read: false,
    },
  });
  notificationId = note.id;
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/notifications/:notificationId', () => {
  it('1. Should successfully mark an unread notification as READ (bool: true)', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .set('Cookie', userCookie)
      .send({ bool: true });

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(true);
    expect(res.body.id).toBe(notificationId);

    // Verify it was actually saved in the database
    const dbCheck = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    expect(dbCheck?.read).toBe(true);
  });

  it('2. Should successfully mark a read notification back to UNREAD (bool: false)', async () => {
    // Manually force the DB state to READ first
    await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .set('Cookie', userCookie)
      .send({ bool: false });

    expect(res.status).toBe(200);
    expect(res.body.read).toBe(false);
  });

  it("3. SECURITY CHECK: Should return 403 if modifying someone else's notification", async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .set('Cookie', strangerCookie) // Sending the wrong user's cookie
      .send({ bool: true });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('Manage Your Own Notifications');
  });

  it('4. Should return 404 if the notification does not exist', async () => {
    const res = await request(app)
      .patch('/api/notifications/cm00000000000000000000000')
      .set('Cookie', userCookie)
      .send({ bool: true });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('5. Should return 401 if the request is missing an auth cookie', async () => {
    const res = await request(app)
      .patch(`/api/notifications/${notificationId}`)
      .send({ bool: true });

    // Caught by your route-level authentication middleware
    expect(res.status).toBe(401);
  });
});
