import request from 'supertest';
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

let adminCookie: string;
let adminId: string;
let projectId: string;
let boardId: string;
let col0Id: string;
let col1Id: string;
let col2Id: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;
  projectId = (await seedProject('Patch Project')).id;
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId);
  boardId = board.id;

  const cols = await prisma.column.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
  });

  col0Id = cols[0].id; // TODO
  col1Id = cols[1].id; // IN_PROGRESS
  col2Id = cols[2].id; // DONE

  // Ensure names are capitalized for the controller logic
  await prisma.column.update({
    where: { id: col1Id },
    data: { name: 'IN_PROGRESS' },
  });
  await prisma.column.update({
    where: { id: col2Id },
    data: { name: 'DONE' },
  });

  adminCookie = await loginUser('admin', 'admin123');
});

beforeEach(async () => {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
  it('1. should generate an audit log and notification when assignee changes', async () => {
    const task = await prisma.task.create({
      data: { title: 'Assignment Test', columnId: col0Id, reporterId: adminId },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ assigneeId: adminId });

    expect(res.status).toBe(200);

    // Check Audit Log
    const log = await prisma.auditLog.findFirst({
      where: { taskId: task.id, action: 'ASSIGNEE_CHANGED' },
    });
    expect(log).toBeDefined();
    expect(log?.newValue).toBe('admin');

    // Check Notification
    const notification = await prisma.notification.findFirst({
      where: { userId: adminId, taskId: task.id },
    });
    expect(notification?.message).toContain('Assigned');
  });

  it('2. should set resolvedAt when moving to DONE and nullify it when moving out', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Timestamp Test',
        columnId: col1Id,
        status: 'IN_PROGRESS',
        reporterId: adminId,
      },
    });

    // Move to DONE
    const doneRes = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col1Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ status: 'DONE' });

    expect(doneRes.body.resolvedAt).not.toBeNull();

    // Move back to IN_PROGRESS
    const backRes = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col2Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ status: 'IN_PROGRESS' });

    expect(backRes.body.resolvedAt).toBeNull();
  });

  it('3. should automatically update parent STORY status when child moves', async () => {
    const story = await prisma.task.create({
      data: {
        title: 'Parent Story',
        type: 'STORY',
        status: 'TODO',
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    const subtask = await prisma.task.create({
      data: {
        title: 'Subtask',
        parentId: story.id,
        status: 'TODO',
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${subtask.id}`
      )
      .set('Cookie', adminCookie)
      .send({ status: 'IN_PROGRESS' });

    const updatedStory = await prisma.task.findUnique({
      where: { id: story.id },
    });

    expect(updatedStory?.status).toBe('IN_PROGRESS');
  });

  it('4. should fail if assignee is not a project member', async () => {
    const task = await prisma.task.create({
      data: { title: 'Security Test', columnId: col0Id, reporterId: adminId },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ assigneeId: 'some-random-id' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Assignee Must Be a Project');
  });

  it('5. should NOT trigger WIP limit if moving within the same column', async () => {
    await prisma.column.update({
      where: { id: col1Id },
      data: { wipLimit: 1 },
    });

    const task = await prisma.task.create({
      data: {
        title: 'Solo',
        columnId: col1Id,
        status: 'IN_PROGRESS',
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col1Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
  });

  it('6. should return 400 for an invalid date format', async () => {
    const task = await prisma.task.create({
      data: { title: 'Date Test', columnId: col0Id, reporterId: adminId },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ dueDate: 'this-is-garbage' });

    expect(res.status).toBe(400);
  });

  it('7. should block setting a parent from a different board', async () => {
    const otherProject = await seedProject('Other');
    const otherBoard = await seedBoard(otherProject.id);
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    const externalStory = await prisma.task.create({
      data: {
        title: 'External',
        type: 'STORY',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    const localTask = await prisma.task.create({
      data: { title: 'Local', columnId: col0Id, reporterId: adminId },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${localTask.id}`
      )
      .set('Cookie', adminCookie)
      .send({ parentId: externalStory.id });

    expect(res.status).toBe(400);
  });

  it('8. should block a task from being its own parent (Cycle Prevention)', async () => {
    const task = await prisma.task.create({
      data: { title: 'Ouroboros Task', columnId: col0Id, reporterId: adminId },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ parentId: task.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('A Task Cannot be Its Own Parent');
  });

  it('9. should block changing a STORY to a TASK if it has subtasks (Type Demotion)', async () => {
    const story = await prisma.task.create({
      data: {
        title: 'Epic Story',
        type: 'STORY',
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    await prisma.task.create({
      data: {
        title: 'Child Task',
        parentId: story.id,
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${story.id}`
      )
      .set('Cookie', adminCookie)
      .send({ type: 'TASK' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(
      'Cannot Change Type to TASK While Subtasks Exist'
    );
  });

  it('10. should successfully remove an assignee and parent when sending explicit null (Nullification Trap)', async () => {
    const story = await prisma.task.create({
      data: {
        title: 'Parent',
        type: 'STORY',
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    const task = await prisma.task.create({
      data: {
        title: 'Loaded Task',
        columnId: col0Id,
        reporterId: adminId,
        assigneeId: adminId,
        parentId: story.id,
      },
    });

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col0Id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie)
      .send({ assigneeId: null, parentId: null });

    expect(res.status).toBe(200);

    const updatedTask = await prisma.task.findUnique({
      where: { id: task.id },
    });
    expect(updatedTask?.assigneeId).toBeNull();
    expect(updatedTask?.parentId).toBeNull();
  });

  it('11. should update the status of the OLD parent when a subtask is reparented (Orphaned Parent)', async () => {
    const storyA = await prisma.task.create({
      data: {
        title: 'Story A',
        type: 'STORY',
        status: 'IN_PROGRESS',
        columnId: col1Id,
        reporterId: adminId,
      },
    });

    const storyB = await prisma.task.create({
      data: {
        title: 'Story B',
        type: 'STORY',
        status: 'TODO',
        columnId: col0Id,
        reporterId: adminId,
      },
    });

    const subtask = await prisma.task.create({
      data: {
        title: 'Active Subtask',
        status: 'IN_PROGRESS',
        parentId: storyA.id,
        columnId: col1Id,
        reporterId: adminId,
      },
    });

    // Move subtask from Story A to Story B
    await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${col1Id}/tasks/${subtask.id}`
      )
      .set('Cookie', adminCookie)
      .send({ parentId: storyB.id });

    const updatedStoryA = await prisma.task.findUnique({
      where: { id: storyA.id },
    });
    const updatedStoryB = await prisma.task.findUnique({
      where: { id: storyB.id },
    });

    // Story B gains the active child
    expect(updatedStoryB?.status).toBe('IN_PROGRESS');

    expect(updatedStoryA?.status).toBe('IN_PROGRESS');
  });
});
