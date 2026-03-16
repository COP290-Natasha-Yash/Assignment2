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
let userCookie: string;
let projectAdminCookie: string;
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

describe('DELETE /api/projects/:id/members/:userId', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app).delete(
      `/api/projects/${projectId}/members/${projectMemberId}`
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not project admin', async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}/members/${projectMemberId}`)
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if user not a member', async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}/members/invaliduserid123`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should remove member successfully as global admin', async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}/members/${projectMemberId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User Was Successfully Removed');
  });

  it('should fail if member already removed', async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}/members/${projectMemberId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should remove member successfully as project admin', async () => {
    await addMember(projectMemberId, projectId, 'MEMBER');
    const response = await request(app)
      .delete(`/api/projects/${projectId}/members/${projectMemberId}`)
      .set('Cookie', projectAdminCookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('User Was Successfully Removed');
  });
});
