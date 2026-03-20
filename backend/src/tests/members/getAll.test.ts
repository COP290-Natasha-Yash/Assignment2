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
let viewerCookie: string;
let projectId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Create Users
  const admin = await seedUser(
    'Project Admin',
    'admin@test.com',
    'admin_u',
    'pass123'
  );
  adminCookie = await loginUser('admin_u', 'pass123');

  const member = await seedUser(
    'Project Member',
    'mem@test.com',
    'mem_u',
    'pass123'
  );
  memberCookie = await loginUser('mem_u', 'pass123');

  const viewer = await seedUser(
    'Project Viewer',
    'view@test.com',
    'view_u',
    'pass123'
  );
  viewerCookie = await loginUser('view_u', 'pass123');

  // 2. Setup Project
  const project = await seedProject('Security Project');
  projectId = project.id;

  // 3. Add Members with specific roles
  await addMember(admin.id, projectId, 'ADMIN');
  await addMember(member.id, projectId, 'MEMBER');
  await addMember(viewer.id, projectId, 'VIEWER');
});

describe('GET /api/projects/:id/members', () => {
  it('1. Should allow an ADMIN to see all members with full user details', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);

    // Check for the 'include' data
    expect(res.body[0]).toHaveProperty('user');
    expect(res.body[0].user).toHaveProperty('name');
    expect(res.body[0].user).not.toHaveProperty('password');
  });

  it('2. Should allow a MEMBER to see the member list', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });

  it('3. Should return 403 for a VIEWER (if restricted in middleware)', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/members`)
      .set('Cookie', viewerCookie);

    // Since your route only lists ['ADMIN', 'MEMBER']
    expect(res.status).toBe(403);
  });

  it("4. Should return 404 for a project that doesn't exist", async () => {
    const res = await request(app)
      .get(`/api/projects/cm00000000000000000000000/members`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
