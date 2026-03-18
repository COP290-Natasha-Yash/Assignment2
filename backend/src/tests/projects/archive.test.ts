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

  // 2. Setup Stranger (Do this once here to speed up tests)
  await seedUser('Stranger', 'stranger@test.com', '_stranger_', 'stranger123');
  strangerCookie = await loginUser('_stranger_', 'stranger123');
});

beforeEach(async () => {
  await prisma.project.deleteMany(); // Wipes old projects
  
  const project = await seedProject('Archive Test Project');
  projectId = project.id;
  
  // Ensure the admin actually has rights to this specific project
  await addMember(adminId, projectId, 'ADMIN'); 
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/archive', () => {
  
  it('1. Should archive project successfully', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);
      
    expect(response.status).toBe(200);
    expect(response.body.archived).toBe(true);
  });

  it('2. Should return 404 for an invalid project ID', async () => {
    const response = await request(app)
      .patch('/api/projects/cm00000000000000000000000/archive') // Use a valid CUID/UUID format that doesn't exist
      .set('Cookie', adminCookie);
      
    expect(response.status).toBe(404);
  });

  it('3. Should fail with 400 if the project is already archived', async () => {
    // 1. Archive it first
    await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);

    // 2. Try to archive it again
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', adminCookie);
      
    expect(response.status).toBe(400);
    expect(response.body.error?.code).toBe('BAD_REQUEST'); 
  });

  it('4. Should return 403 if user is not a project member', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/archive`)
      .set('Cookie', strangerCookie);

    expect(response.status).toBe(403);
  });
});