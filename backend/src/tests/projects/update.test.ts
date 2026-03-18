import request from 'supertest';
import app from '../../index';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  loginUser,
  seedUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let projectId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  const project = await seedProject('Project1');
  projectId = project.id;
  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id', () => {
  it('1. Should update project successfully with various field combinations', async () => {
    const fullUpdate = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Name', description: 'New Description' })
      .set('Cookie', adminCookie);
    expect(fullUpdate.status).toBe(200);
    expect(fullUpdate.body.name).toBe('Updated Name');
    expect(fullUpdate.body.description).toBe('New Description');

    const partialUpdate = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ description: 'Only Description Updated' })
      .set('Cookie', adminCookie);
    expect(partialUpdate.status).toBe(200);
    expect(partialUpdate.body.description).toBe('Only Description Updated');
  });

  it('2. Should fail for invalid data or non-existent project', async () => {
    const notFound = await request(app)
      .patch('/api/projects/noproject')
      .send({ name: 'New Name' })
      .set('Cookie', adminCookie);
    expect(notFound.status).toBe(404);

    const badData = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: null })
      .set('Cookie', adminCookie);
    expect(badData.status).toBe(400);
  });

  it('3. Should fail if user is not a project member', async () => {
    await seedUser(
      'Stranger',
      'stranger@test.com',
      '_stranger_',
      'stranger123'
    );
    const strangerCookie = await loginUser('_stranger_', 'stranger123');

    const response = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Hacked Project Name' })
      .set('Cookie', strangerCookie);

    expect(response.status).toBe(403);
  });
});
