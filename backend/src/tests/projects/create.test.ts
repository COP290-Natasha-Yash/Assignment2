import request from 'supertest';
import app from '../../index';
import { clearDatabase, seedAdmin, loginUser } from '../helpers/testHelpers';

let adminCookie: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();
  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('POST /api/projects', () => {
  it('1. Should create project successfully with optional description', async () => {
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
      .send({})
      .set('Cookie', adminCookie);
    expect(missing.status).toBe(400);

    const whitespace = await request(app)
      .post('/api/projects')
      .send({ name: '   ' })
      .set('Cookie', adminCookie);
    expect(whitespace.status).toBe(400);
  });
});
