import request from 'supertest';
import app from '../../index';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  addMember,
  loginUser,
} from '../00_helpers/testHelpers';

let adminCookie: string;
let projectAdminCookie: string;
let userCookie: string;
let projectId: string;
let projectMemberId: string;

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
  const project = await seedProject('Project1');
  projectId = project.id;
  projectMemberId = projectMember.id;
  await addMember(projectAdmin.id, project.id, 'ADMIN');
  await addMember(projectMember.id, project.id, 'MEMBER');
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
  projectAdminCookie = await loginUser('_projectadmin_', 'projectadmin123');
});

describe('PATCH /api/projects/:id/members/:userId', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({ role: 'ADMIN' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not project admin', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({ role: 'ADMIN' })
      .set('Cookie', userCookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if role is invalid', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({ role: 'INVALID_ROLE' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if role is missing', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({})
      .set('Cookie', adminCookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should fail if user not a member', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/invaliduserid123`)
      .send({ role: 'ADMIN' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should update role successfully as global admin', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({ role: 'ADMIN' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('ADMIN');
  });

  it('should update role successfully as project admin', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/members/${projectMemberId}`)
      .send({ role: 'MEMBER' })
      .set('Cookie', projectAdminCookie);
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('MEMBER');
  });
});
