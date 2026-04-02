import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  loginUser,
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

describe('POST /api/projects/:id/boards', () => {
  it('1. Should fail if name is missing', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .send({})
      .set('Cookie', adminCookie);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('2. Should fail if project not found', async () => {
    const response = await request(app)
      .post('/api/projects/invalidid123/boards')
      .send({ name: 'Test Board' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('3. Should create board successfully', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .send({ name: 'Test Board' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Board');
    expect(response.body.id).toBeDefined();
  });

  it('4. Should create default columns when board is created', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/boards`)
      .send({ name: 'Board With Columns' })
      .set('Cookie', adminCookie);
    const boardId = response.body.id;
    const columns = await prisma.column.findMany({ where: { boardId } });
    expect(columns).toHaveLength(5);
    const columnNames = columns.map((c) => c.name);
    expect(columnNames).toContain('TO_DO');
    expect(columnNames).toContain('IN_PROGRESS');
    expect(columnNames).toContain('IN_REVIEW');
    expect(columnNames).toContain('DONE');
    expect(columnNames).toContain('CLOSED');
  });
});
