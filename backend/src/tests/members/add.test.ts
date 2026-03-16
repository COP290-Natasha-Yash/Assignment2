import request from 'supertest';
import app from '../../index';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  loginUser,
} from '../00_helpers/testHelpers';

let adminCookie: string;
let userCookie: string;
let projectId: string;
let projectAdminId: string;
let projectMemberId: string;
let projectViewerId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const projectAdmin = await seedUser(
    'Project Admin',
    'projectadmin@test.com',
    '_projectadmin_',
    'projectadmin123'
  );
  const projectMember = await seedUser(
    'Project Member',
    'projectmember@test.com',
    '_projectmember_',
    'projectmember123'
  );
  const projectViewer = await seedUser(
    'Project Viewer',
    'projectviewer@test.com',
    '_projectviewer_',
    'projectviewer123'
  );
  const project = await seedProject('Project1');
  projectId = project.id;
  projectAdminId = projectAdmin.id;
  projectMemberId = projectMember.id;
  projectViewerId = projectViewer.id;
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('POST /api/projects/:id/members', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectAdminId, role: 'ADMIN' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not project admin', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectAdminId, role: 'ADMIN' })
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if user not found', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: 'invaliduserid123', role: 'MEMBER' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should add project admin successfully', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectAdminId, role: 'ADMIN' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.role).toBe('ADMIN');
  });

  it('should add project member successfully', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectMemberId, role: 'MEMBER' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.role).toBe('MEMBER');
  });

  it('should add project viewer successfully', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectViewerId, role: 'VIEWER' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.role).toBe('VIEWER');
  });

  it('should fail if user already a member', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectAdminId, role: 'ADMIN' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if role is invalid', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .send({ userId: projectViewerId, role: 'SUPER_HACKER' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});
