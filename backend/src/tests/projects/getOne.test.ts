import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  loginUser,
  seedUser,
  addMember,
} from '../helpers/testHelpers';

let adminCookie: string;
let strangerCookie: string;
let adminId: string;
let projectId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Admin
  const admin = await seedAdmin();
  adminId = admin.id;
  adminCookie = await loginUser('admin', 'admin123');

  // 2. Setup Stranger once (Saves time by hashing the password upfront)
  await seedUser('Stranger', 'stranger@test.com', '_stranger_', 'stranger123');
  strangerCookie = await loginUser('_stranger_', 'stranger123');
});

beforeEach(async () => {
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Project Details Test');
  projectId = project.id;

  // Ensure the admin actually has rights to this specific project
  await addMember(adminId, projectId, 'ADMIN');
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id', () => {
  it('1. Should return project details for an authorized user', async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(projectId);
    expect(response.body.name).toBe('Project Details Test');
  });

  it('2. Should return 404 if the project does not exist', async () => {
    // Use a fake ID that matches the DB's format (e.g., CUID or UUID)
    const fakeId = 'cm00000000000000000000000';

    const response = await request(app)
      .get(`/api/projects/${fakeId}`)
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
  });

  it('3. Should return 403 if the user is not a member of the project', async () => {
    //The Stranger isn't in the project members table, so this should trigger RBAC failure
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set('Cookie', strangerCookie);

    expect(response.status).toBe(403);
  });
});
