import request from 'supertest';
import bcrypt from 'bcrypt'; // ADDED: Import your hashing library
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  addMember,
  loginUser,
} from '../helpers/testHelpers';

let viewerCookie: string;
let adminId: string;
let viewerId: string;
let projectId: string;
let taskId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Admin
  const admin = await seedAdmin();
  adminId = admin.id;

  // 2. Setup Viewer with a PROPERLY hashed password
  const plainTextPassword = 'viewerpassword123';
  const hashedPassword = await bcrypt.hash(plainTextPassword, 10); // Hash it!

  const viewer = await prisma.user.create({
    data: {
      name: 'Viewer',
      email: 'viewer@example.com',
      password: hashedPassword, // Save the valid hash
      username: 'viewguy',
    },
  });
  viewerId = viewer.id;

  // 3. Setup Project & Members
  const project = await seedProject('Get All Comments Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');
  await addMember(viewerId, projectId, 'VIEWER'); // Note the VIEWER role

  // 4. Setup Board, Column, and Task
  const board = await seedBoard(projectId);
  const column = await prisma.column.findFirst({
    where: { boardId: board.id },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Read-Only Task',
      columnId: column!.id,
      reporterId: adminId,
    },
  });
  taskId = task.id;

  // 5. Login the Viewer (This will now successfully return the cookie!)
  viewerCookie = await loginUser('viewguy', plainTextPassword);
});

beforeEach(async () => {
  await prisma.comment.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/tasks/:taskId/comments', () => {
  it('1. should return all comments ordered by creation date (oldest first)', async () => {
    await prisma.comment.create({
      data: {
        content: 'Second comment',
        taskId,
        authorId: adminId,
        createdAt: new Date('2026-01-02'),
      },
    });
    await prisma.comment.create({
      data: {
        content: 'First comment',
        taskId,
        authorId: viewerId,
        createdAt: new Date('2026-01-01'),
      },
    });

    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', viewerCookie); // Testing explicitly with VIEWER

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);

    expect(res.body[0].content).toBe('First comment');
    expect(res.body[0].authorId).toBe(viewerId);

    expect(res.body[1].content).toBe('Second comment');
    expect(res.body[1].authorId).toBe(adminId);
  });

  it('2. should return an empty array if there are no comments on the task', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks/${taskId}/comments`)
      .set('Cookie', viewerCookie); // Testing explicitly with VIEWER

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('3. should return 404 if the task is in a different project (IDOR Protection)', async () => {
    const otherProject = await seedProject('Other Project');
    await seedBoard(otherProject.id);
    const otherCol = await prisma.column.findFirst({
      where: { board: { projectId: otherProject.id } },
    });

    const otherTask = await prisma.task.create({
      data: {
        title: 'Other Task',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks/${otherTask.id}/comments`)
      .set('Cookie', viewerCookie); // Testing explicitly with VIEWER

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task NOT Found');
  });
});
