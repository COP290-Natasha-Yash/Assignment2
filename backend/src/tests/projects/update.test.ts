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

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const project = await seedProject('Project1');
  projectId = project.id;
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('PATCH /api/projects/:id', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Project' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not a project member', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Project' })
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if project not found', async () => {
    const response = await request(app)
      .patch('/api/projects/noproject')
      .send({ name: 'Updated Project' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('should fail for non-member accessing non-existent project', async () => {
    const response = await request(app)
      .patch('/api/projects/noproject')
      .send({ name: 'Updated Project' })
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should update project name successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Project1' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Updated Project1');
  });

  it('should update project description successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Project1', description: 'New Description' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('New Description');
  });

  it('should update only description without name', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ description: 'Only Description Updated' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('Only Description Updated');
  });

  it('should fail if name is null', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: null })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });
});
