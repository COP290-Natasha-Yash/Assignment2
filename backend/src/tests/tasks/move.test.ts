import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedProject,
  seedBoard,
  seedColumn,
  seedTask,
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
let closedColId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;

  const project = await seedProject('Move Logic Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Kanban Board');
  boardId = board.id;

  // Fetch and normalize columns to ensure we know exactly what we are testing
  const columns = await prisma.column.findMany({
    where: { boardId },
    orderBy: { order: 'asc' },
  });

  col0Id = columns[0].id;
  col1Id = columns[1].id;
  col2Id = columns[2].id;

  // Standardize names for the move-logic checks (DONE, IN_PROGRESS)
  await prisma.column.update({
    where: { id: col1Id },
    data: { name: 'IN_PROGRESS' },
  });
  await prisma.column.update({
    where: { id: col2Id },
    data: { name: 'DONE' },
  });

  const closedCol = await seedColumn(boardId, 'CLOSED', 10);
  closedColId = closedCol.id;

  adminCookie = await loginUser('admin', 'admin123');
});

beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/boards/:boardId/tasks/:taskId/move', () => {
  it('1. Should successfully move a task to an adjacent column and sync status', async () => {
    const task = await seedTask(col0Id, adminId, 'Valid Move');

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col1Id });

    expect(res.status).toBe(200);
    expect(res.body.columnId).toBe(col1Id);
    expect(res.body.status).toBe('IN_PROGRESS');
  });

  it('2. Should block moving a task of type STORY', async () => {
    const story = await seedTask(col0Id, adminId, 'Immovable Story', 'STORY');

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${story.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col1Id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(
      '"STORY" Type task is NOT Movable'
    );
  });

  it('3. Should enforce the adjacency rule (Order 0 cannot jump to Order 2)', async () => {
    const task = await seedTask(col0Id, adminId, 'Long Jumper');

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col2Id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('4. Should allow non-adjacent moves IF the destination is the CLOSED column', async () => {
    const task = await seedTask(col0Id, adminId, 'Emergency Shutdown');

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: closedColId });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CLOSED');
    expect(res.body.closedAt).not.toBeNull();
  });

  it('5. Should manage WIP limits correctly on the destination column', async () => {
    // Set WIP limit of col1 to 1 and fill it
    await prisma.column.update({
      where: { id: col1Id },
      data: { wipLimit: 1 },
    });

    await seedTask(col1Id, adminId, 'Occupant');
    const task = await seedTask(col0Id, adminId, 'Waitlisted');

    const res = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col1Id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WIP_LIMIT_REACHED');

    // Cleanup: Reset WIP limit
    await prisma.column.update({
      where: { id: col1Id },
      data: { wipLimit: null },
    });
  });

  it('6. Should set resolvedAt when moving to DONE and nullify it when moving out', async () => {
    const task = await seedTask(col1Id, adminId, 'Resolved-Unresolved');

    // 1. Move to DONE
    const doneRes = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col2Id });

    expect(doneRes.body.resolvedAt).not.toBeNull();

    // 2. Move back to IN_PROGRESS
    const backRes = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/tasks/${task.id}/move`
      )
      .set('Cookie', adminCookie)
      .send({ columnId: col1Id });

    expect(backRes.body.resolvedAt).toBeNull();
  });
});
