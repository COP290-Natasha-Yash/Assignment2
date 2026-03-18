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
  seedUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let adminId: string;
let projectId: string;
let boardId: string;
let columnId: string;

beforeAll(async () => {
  await clearDatabase();
  const admin = await seedAdmin();
  adminId = admin.id;

  const project = await seedProject('Deletion Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Main Board');
  boardId = board.id;

  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  adminCookie = await loginUser('admin', 'admin123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('DELETE /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
  it('1. Sould successfully delete a single task', async () => {
    const task = await prisma.task.create({
      data: { title: 'Solo Task', columnId, reporterId: adminId },
    });

    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Task Deleted Successfully');

    // Verify DB
    const found = await prisma.task.findUnique({ where: { id: task.id } });
    expect(found).toBeNull();
  });

  it('2. Should delete a Story and all its Subtasks via database cascade', async () => {
    // 1. Setup Hierarchy
    const story = await prisma.task.create({
      data: {
        title: 'Parent Story',
        type: 'STORY',
        columnId,
        reporterId: adminId,
      },
    });
    const sub1 = await prisma.task.create({
      data: {
        title: 'Sub 1',
        type: 'TASK',
        parentId: story.id,
        columnId,
        reporterId: adminId,
      },
    });
    const sub2 = await prisma.task.create({
      data: {
        title: 'Sub 2',
        type: 'TASK',
        parentId: story.id,
        columnId,
        reporterId: adminId,
      },
    });

    // 2. Delete Parent
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${story.id}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);

    // 3. Verify everything is gone (Recursive deletion check)
    const remaining = await prisma.task.findMany({
      where: { id: { in: [story.id, sub1.id, sub2.id] } },
    });
    expect(remaining.length).toBe(0);
  });

  it('3. Should return 404 if the task is in the wrong column path', async () => {
    const task = await prisma.task.create({
      data: { title: 'Misplaced Task', columnId, reporterId: adminId },
    });

    // Create a second column on the same board
    const otherCol = await prisma.column.create({
      data: { name: 'Done', order: 10, boardId },
    });

    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol.id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task Not Found');
  });

  it('4. Should return 404 if the board does not belong to the project', async () => {
    const otherProject = await seedProject('Wrong Project');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    const task = await prisma.task.create({
      data: {
        title: 'Project B Task',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    // Try to access task using Project A's ID in the URL
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${otherBoard.id}/columns/${otherCol!.id}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Board Not Found');
  });

  it('5. Should return 404 if the task has already been deleted', async () => {
    // 1. Create a task
    const task = await prisma.task.create({
      data: { title: 'Ghost Task', columnId, reporterId: adminId },
    });

    // 2. Delete it once
    await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie);

    // 3. Try to delete again
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${task.id}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task Not Found');
  });

  it('6. Should return 403 if a VIEWER tries to delete a task', async () => {
    const viewer = await seedUser('Viewer', 'v@t.com', 'viewer_u', 'pass123');
    await addMember(viewer.id, projectId, 'VIEWER');
    const viewerCookie = await loginUser('viewer_u', 'pass123');

    const task = await prisma.task.create({
      data: { title: 'Safe Task', columnId, reporterId: adminId },
    });

    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${task.id}`
      )
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(403);
  });
});
