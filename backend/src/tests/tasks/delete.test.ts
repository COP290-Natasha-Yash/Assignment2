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

beforeEach(async () => {
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await clearDatabase();
});

describe('DELETE /api/projects/:id/boards/:boardId/columns/:columnId/tasks/:taskId', () => {
  it('1. Should successfully delete a single task', async () => {
    const task = await seedTask(columnId, adminId, 'Solo Task');

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
    const story = await seedTask(columnId, adminId, 'Parent Story', 'STORY');
    const sub1 = await seedTask(columnId, adminId, 'Sub 1', 'TASK', story.id);
    const sub2 = await seedTask(columnId, adminId, 'Sub 2', 'TASK', story.id);

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
    const task = await seedTask(columnId, adminId, 'Misplaced Task');
    const otherCol = await seedColumn(boardId, 'Done', 10);

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

    const task = await seedTask(otherCol!.id, adminId, 'Project B Task');

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
    const task = await seedTask(columnId, adminId, 'Ghost Task');

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

    const task = await seedTask(columnId, adminId, 'Safe Task');

    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks/${task.id}`
      )
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(403);
  });
});
