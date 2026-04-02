import request from 'supertest';
import bcrypt from 'bcrypt';
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
let otherTaskId: string;
let commentId: string;

beforeAll(async () => {
  await clearDatabase();

  const admin = await seedAdmin();
  adminId = admin.id;

  const plainTextPassword = 'viewerpassword123';
  const hashedPassword = await bcrypt.hash(plainTextPassword, 10);

  const viewer = await prisma.user.create({
    data: {
      name: 'Viewer',
      email: 'viewer@example.com',
      password: hashedPassword,
      username: 'viewguy',
    },
  });
  viewerId = viewer.id;

  const project = await seedProject('Get Single Comment Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');
  await addMember(viewerId, projectId, 'VIEWER');

  const board = await seedBoard(projectId);
  const column = await prisma.column.findFirst({
    where: { boardId: board.id },
  });

  const task = await prisma.task.create({
    data: { title: 'Primary Task', columnId: column!.id, reporterId: adminId },
  });
  taskId = task.id;

  const otherTask = await prisma.task.create({
    data: { title: 'Decoy Task', columnId: column!.id, reporterId: adminId },
  });
  otherTaskId = otherTask.id;

  viewerCookie = await loginUser('viewguy', plainTextPassword);
});

beforeEach(async () => {
  await prisma.comment.deleteMany();

  const comment = await prisma.comment.create({
    data: { content: 'Target comment', taskId, authorId: adminId },
  });
  commentId = comment.id;
});

afterAll(async () => {
  await clearDatabase();
});

describe('GET /api/projects/:id/tasks/:taskId/comments/:commentId', () => {
  it('1. should return the specific comment WITH author details', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(commentId);
    expect(res.body.content).toBe('Target comment');

    //Verify the nested author object exists and hides the password
    expect(res.body.author).toBeDefined();
    expect(res.body.author.id).toBe(adminId);
    expect(res.body.author.name).toBe('Global Admin');
    expect(res.body.author.password).toBeUndefined(); // Security check!
  });

  it('2. should return 404 if the comment does not exist', async () => {
    const fakeCommentId = 'cm00000000000000000000000';
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/tasks/${taskId}/comments/${fakeCommentId}`
      )
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(404);
  });

  it('3. should return 404 if the comment exists but belongs to a different task', async () => {
    const res = await request(app)
      .get(
        `/api/projects/${projectId}/tasks/${otherTaskId}/comments/${commentId}`
      )
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(404);
  });

  it('4. should return 404 if the task is in a different project (IDOR Protection)', async () => {
    const otherProject = await seedProject('Other Project');
    await seedBoard(otherProject.id);
    const otherCol = await prisma.column.findFirst({
      where: { board: { projectId: otherProject.id } },
    });

    const decoyProjectTask = await prisma.task.create({
      data: {
        title: 'Decoy Project Task',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .get(
        `/api/projects/${projectId}/tasks/${decoyProjectTask.id}/comments/${commentId}`
      )
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(404);
  });
});
