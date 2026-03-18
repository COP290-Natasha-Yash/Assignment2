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
  seedTask,
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

  const project = await seedProject('Task Flow Project');
  projectId = project.id;

  await addMember(adminId, projectId, 'ADMIN');

  const board = await seedBoard(projectId, 'Kanban Board');
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

describe('POST /api/projects/:id/boards/:boardId/columns/:columnId/tasks', () => {
  it('1. Should create a task successfully with status matching column name', async () => {
    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({
        title: 'New Dashboard',
        priority: 'HIGH',
        type: 'TASK',
        reporterId: adminId,
      });

    const column = await prisma.column.findUnique({ where: { id: columnId } });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New Dashboard');
    expect(res.body.status).toBe(column!.name);
  });

  it('2. Should fail when WIP limit is reached', async () => {
    // 1. Set WIP limit to 1
    await prisma.column.update({
      where: { id: columnId },
      data: { wipLimit: 1 },
    });

    await seedTask(columnId, adminId, 'The Allowed Task');

    // 3. Try to create a second one
    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({ title: 'Blocked Task', reporterId: adminId });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(
      'WIP LIMIT REACHED -- CANNOT CREATE A NEW TASK'
    );

    // Reset limit
    await prisma.column.update({
      where: { id: columnId },
      data: { wipLimit: null },
    });
  });

  it('3. Should fail for invalid priority enum', async () => {
    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({ title: 'Task', reporterId: adminId, priority: 'ULTRA_HIGH' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid priority');
  });

  it('4. Should successfully link a SUBTASK to a STORY on the same board', async () => {
    const otherColumn = await prisma.column.findFirst({
      where: { boardId, NOT: { id: columnId } },
    });

    const story = await seedTask(
      otherColumn!.id,
      adminId,
      'User Story',
      'STORY'
    );

    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({
        title: 'Subtask A',
        type: 'TASK',
        parentId: story.id,
        reporterId: adminId,
      });

    expect(res.status).toBe(201);
    expect(res.body.parentId).toBe(story.id);
  });

  it('5. Should fail if parent task is on a different board', async () => {
    const otherBoard = await seedBoard(projectId, 'Other Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    const outsideStory = await seedTask(
      otherCol!.id,
      adminId,
      'Outside Story',
      'STORY'
    );

    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({
        title: 'Illegal Subtask',
        parentId: outsideStory.id,
        reporterId: adminId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe(
      'Parent Task Must Be On The Same Board'
    );
  });

  it('6. Should fail if reporter is not a project member', async () => {
    const stranger = await seedUser('Stranger', 's@t.com', 'stranger', 'p123');

    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({ title: 'Ghost Task', reporterId: stranger.id });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain(
      'Reporter Must Be a Project "ADMIN" or "MEMBER"'
    );
  });

  it('7. Should fail if dueDate is not in the future', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const res = await request(app)
      .post(
        `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}/tasks`
      )
      .set('Cookie', adminCookie)
      .send({
        title: 'Late Task',
        dueDate: yesterday.toISOString(),
        reporterId: adminId,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Due Date Must Be in The Future');
  });
});
