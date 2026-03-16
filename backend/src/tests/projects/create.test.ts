import request from 'supertest';
import app from '../../index';

import {
  clearDatabase,
  seedAdmin,
  seedUser,
  loginUser,
} from '../00_helpers/testHelpers';

let adminCookie: string;
let userCookie: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  adminCookie = await loginUser('admin', 'admin123');
  userCookie = await loginUser('_yash_', 'yash123');
});

describe('POST /api/projects', () => {
  it('should fail if not logged in', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Project1' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should fail if not global admin', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Project1' })
      .set('Cookie', userCookie);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('should fail if name is missing', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({})
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should create project successfully', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Project1' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Project1');
    expect(response.body.id).toBeDefined();
  });

  it('should fail if name is whitespace', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: '   ' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('should create project with description', async () => {
    const response = await request(app)
      .post('/api/projects')
      .send({ name: 'Project2', description: 'Test Description' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Project2');
    expect(response.body.description).toBe('Test Description');
  });
});

afterAll(async () => {
  await clearDatabase();
});
