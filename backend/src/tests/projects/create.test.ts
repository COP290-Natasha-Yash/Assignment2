import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let normalUserCookie: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Global Admin
  await seedAdmin();
  adminCookie = await loginUser('admin', 'admin123');

  // 2. Setup Normal User
  await seedUser('Normal', 'normal@test.com', '_normal_', 'normal123');
  normalUserCookie = await loginUser('_normal_', 'normal123');
});

beforeEach(async () => {
  await prisma.project.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/projects', () => {
  it('1. Should create project successfully as a GLOBAL_ADMIN', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Project1', description: 'Test Description' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Project1');
    expect(response.body.description).toBe('Test Description');
    expect(response.body.id).toBeDefined();
  });

  it('2. Should fail if name is missing or only whitespace', async () => {
    const missing = await request(app)
      .post('/api/projects')
      .send({ description: 'I forgot the name' })
      .set('Cookie', adminCookie);
    expect(missing.status).toBe(400);

    const whitespace = await request(app)
      .post('/api/projects')
      .send({ name: '   ' })
      .set('Cookie', adminCookie);
    expect(whitespace.status).toBe(400);
  });

  it('3. Should fail if the user is not authenticated', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Sneaky Project' });

    expect(response.status).toBe(401);
  });

  it('4. Should return 403 Forbidden if a normal user tries to create a project', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'User Project' })
      .set('Cookie', normalUserCookie);

    expect(response.status).toBe(403);
  });
});
