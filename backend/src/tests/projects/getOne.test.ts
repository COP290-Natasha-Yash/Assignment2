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

describe('GET /api/projects/:id', () => {
  it('1. Should return project for global admin', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', adminCookie);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(projectId);
  });

  it('2. Should fail if project is missing or user is not a member', async () => {
    const notFound = await request(app)
      .get('/api/projects/noproject')
      .set('Cookie', adminCookie);
    expect(notFound.status).toBe(404);

    await seedUser(
      'Stranger',
      'stranger@test.com',
      '_stranger_',
      'stranger123'
    );
    const strangerCookie = await loginUser('_stranger_', 'stranger123');
    const unauthorized = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', strangerCookie);
    expect(unauthorized.status).toBe(403);
  });
});
