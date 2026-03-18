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

  // 2. Setup Stranger 
  await seedUser('Stranger', 'stranger@test.com', '_stranger_', 'stranger123');
  strangerCookie = await loginUser('_stranger_', 'stranger123');
});

beforeEach(async () => {
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();

  const project = await seedProject('Original Project Name');
  projectId = project.id;
  
  // CGive the admin explicit permission to edit this project!
  await addMember(adminId, projectId, 'ADMIN');
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id', () => {
  
  it('1. Should update project successfully with all fields', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Updated Name', description: 'New Description' })
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Name');
    expect(res.body.description).toBe('New Description');
  });

  it('2. Should successfully perform a partial update (description only)', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ description: 'Only Description Updated' })
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Original Project Name'); // Name shouldn't change
    expect(res.body.description).toBe('Only Description Updated');
  });

  it('3. Should return 404 for a non-existent project', async () => {
    // Use a fake ID matching the DB's format
    const fakeId = 'cm00000000000000000000000';
    
    const res = await request(app)
      .patch(`/api/projects/${fakeId}`)
      .send({ name: 'New Name' })
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
  });

  it('4. Should return 400 for invalid data formats', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: null }) // Invalid name
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
  });

  it('5. Should return 403 if user is not a project member', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}`)
      .send({ name: 'Hacked Project Name' })
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(403);
    
    // Verify the DB wasn't touched
    const unchangedProject = await prisma.project.findUnique({ where: { id: projectId } });
    expect(unchangedProject?.name).toBe('Original Project Name');
  });
});