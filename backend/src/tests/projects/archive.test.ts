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

beforeAll(async () => {
  await clearDatabase();

  // Create an Admin and a regular Member
  const admin = await seedUser(
    'Admin User',
    'admin@test.com',
    'admin_u',
    'pass123'
  );
  adminCookie = await loginUser('admin_u', 'pass123');

  const member = await seedUser(
    'Member User',
    'mem@test.com',
    'mem_u',
    'pass123'
  );
  memberCookie = await loginUser('mem_u', 'pass123');
});

beforeEach(async () => {
  // Wipe projects to ensure a clean state
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  // Create a fresh, UNARCHIVED project
  const project = await seedProject('Archive Test Project');
  projectId = project.id;

  // Retrieve the actual user IDs from the database
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin_u' },
  });
  const memberUser = await prisma.user.findUnique({
    where: { username: 'mem_u' },
  });

  // Assign roles using the IDs, NOT the cookies
  if (adminUser && memberUser) {
    await addMember(adminUser.id, projectId, 'ADMIN');
    await addMember(memberUser.id, projectId, 'MEMBER');
  }
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/archive', () => {
  it('1. Should successfully archive a project (bool: true)', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie)
      .send({ bool: true });

    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(true);

    // Verify in DB
    const dbCheck = await prisma.project.findUnique({
      where: { id: projectId },
    });
    expect(dbCheck?.archived).toBe(true);
  });

  it('2. Should successfully unarchive a project (bool: false)', async () => {
    // Manually archive it first
    await prisma.project.update({
      where: { id: projectId },
      data: { archived: true },
    });

    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie)
      .send({ bool: false });

    expect(res.status).toBe(200);
    expect(res.body.archived).toBe(false);
  });

  it('3. Should return 400 if trying to archive an already archived project', async () => {
    await prisma.project.update({
      where: { id: projectId },
      data: { archived: true },
    });

    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie)
      .send({ bool: true });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Project is Already Archived');
  });

  it('4. Should return 400 if trying to unarchive an already unarchived project', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie)
      .send({ bool: false });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Project is Already Unarchived');
  });

  it('5. Should return 400 if bool is missing or invalid type', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie)
      .send({ bool: 'yes' }); // Sending a string instead of a boolean

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('A Boolean Value is Required');
  });

  it('6. SECURITY CHECK: Should return 403 if a MEMBER tries to archive', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', memberCookie)
      .send({ bool: true });

    expect(res.status).toBe(403);
  });
});
