import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedUser,
  loginUser,
  seedProject,
  addMember,
} from '../helpers/testHelpers';

let adminCookie: string;
let memberCookie: string;
let projectId: string;

let targetUserId1: string;
let targetUserId2: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup the Inviter (Admin) and a standard Member
  const adminUser = await seedUser(
    'Project Admin',
    'admin@test.com',
    'admin_u',
    'pass123'
  );
  adminCookie = await loginUser('admin_u', 'pass123');

  const memberUser = await seedUser(
    'Standard Member',
    'mem@test.com',
    'mem_u',
    'pass123'
  );
  memberCookie = await loginUser('mem_u', 'pass123');

  // 2. Setup targets to be invited
  const target1 = await seedUser(
    'Target One',
    'target1@test.com',
    'target_1',
    'pass123'
  );
  targetUserId1 = target1.id;

  const target2 = await seedUser(
    'Target Two',
    'target2@test.com',
    'target_2',
    'pass123'
  );
  targetUserId2 = target2.id;

  // 3. Setup Project and initial roles
  const project = await seedProject('Invitation Test Project');
  projectId = project.id;

  await addMember(adminUser.id, projectId, 'ADMIN');
  await addMember(memberUser.id, projectId, 'MEMBER');
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/projects/:id/members', () => {
  it('1. Should successfully add a new member using their EMAIL', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ email: 'target1@test.com', role: 'VIEWER' });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('VIEWER');
    expect(res.body.userId).toBe(targetUserId1);

    // Verify DB state
    const dbCheck = await prisma.projectMember.findFirst({
      where: { userId: targetUserId1, projectId },
    });
    expect(dbCheck).not.toBeNull();
  });

  it('2. Should successfully add a new member using their USERNAME', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ username: 'target_2', role: 'MEMBER' });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('MEMBER');
    expect(res.body.userId).toBe(targetUserId2);
  });

  it('3. Should return 400 if trying to add someone who is already a member', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ username: 'target_2', role: 'ADMIN' }); // Target 2 was added in previous test

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('User is Already a Member');
  });

  it('4. Should return 400 if role is invalid', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ email: 'doesntexist@test.com', role: 'SUPERADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('5. Should return 400 if neither email nor username is provided', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ role: 'VIEWER' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Email or Username is Required');
  });

  it('6. Should return 404 if the user does not exist in the system', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ email: 'ghost@test.com', role: 'MEMBER' });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('User Not Found');
  });

  it('7. SECURITY CHECK: Should return 403 if a standard MEMBER tries to invite someone', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', memberCookie) // Sending member's cookie instead of admin
      .send({ username: 'some_new_user', role: 'VIEWER' });

    expect(res.status).toBe(403);
  });
});
