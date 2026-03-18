import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma'; 
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  loginUser,
  addMember, 
} from '../helpers/testHelpers';

let adminCookie: string;
let userCookie: string;
let yashId: string; 

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  
  // Seed the user and save the ID
  const yash = await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  yashId = yash.id;

  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

beforeEach(async () => {
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects', () => {
  
  it('1. Should return all projects for a global admin', async () => {
    // Admin is NOT explicitly added to this project
    await seedProject('Admin View Project');
    
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', adminCookie);
      
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Admin View Project');
  });

  it('2. Should return an empty array for a user with no project memberships', async () => {
    // Yash is NOT added to this project
    await seedProject('Hidden Project'); 
    
    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', userCookie);
      
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // Should be completely empty
  });

  it('3. Should return ONLY the projects the user is explicitly a member of', async () => {
    // 1. Create a project Yash IS a member of
    const visibleProject = await seedProject('Visible Project');
    await addMember(yashId, visibleProject.id, 'MEMBER');

    // 2. Create a project Yash is NOT a member of
    await seedProject('Secret Project');

    const res = await request(app)
      .get('/api/projects')
      .set('Cookie', userCookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1); // The backend should filter out the Secret Project
    expect(res.body[0].name).toBe('Visible Project');
  });
  
});