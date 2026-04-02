import request from 'supertest';
import app from '../../index';
import { prisma } from '../../prisma';
import {
  clearDatabase,
  seedAdmin,
  seedUser,
  seedProject,
  seedBoard,
  addMember,
  loginUser,
} from '../helpers/testHelpers';

let adminCookie: string;
let memberCookie: string;
let projectId: string;
let boardId: string;
let columnId: string;

beforeAll(async () => {
  await clearDatabase();
  await seedAdmin();

  const user = await seedUser('Yash', 'yash@test.com', '_yash_', 'yash123');
  const project = await seedProject('Project1');
  projectId = project.id;

  await addMember(user.id, projectId, 'MEMBER');
  const board = await seedBoard(projectId, 'Board1');
  boardId = board.id;

  const column = await prisma.column.findFirst({ where: { boardId } });
  columnId = column!.id;

  adminCookie = await loginUser('admin', 'admin123');
  memberCookie = await loginUser('_yash_', 'yash123');
});

afterAll(async () => {
  await clearDatabase();
});

describe('PATCH /api/projects/:id/boards/:boardId/columns/:columnId', () => {
  it('1. Should update name and wipLimit successfully (full and partial)', async () => {
    // 1. Full update
    const res1 = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ name: 'Sprint Backlog', wipLimit: 5 })
      .set('Cookie', adminCookie);
    expect(res1.status).toBe(200);
    expect(res1.body.name).toBe('Sprint Backlog');
    expect(res1.body.wipLimit).toBe(5);

    // 2. Partial update (name only)
    const res2 = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ name: 'Updated Name' })
      .set('Cookie', adminCookie);
    expect(res2.status).toBe(200);
    expect(res2.body.wipLimit).toBe(5); // Should persist

    // 3. Partial update (clear wipLimit)
    const res3 = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ wipLimit: null })
      .set('Cookie', adminCookie);
    expect(res3.status).toBe(200);
    expect(res3.body.wipLimit).toBeNull();
  });

  it('2. Should fail if wipLimit is invalid', async () => {
    const payloads = [
      { wipLimit: -1 },
      { wipLimit: 5.5 },
      { wipLimit: 'five' },
    ];

    for (const payload of payloads) {
      const response = await request(app)
        .patch(
          `/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`
        )
        .send(payload)
        .set('Cookie', adminCookie);
      expect(response.status).toBe(400);
    }
  });

  it('3. Should fail if name is provided but invalid', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ name: '   ' })
      .set('Cookie', adminCookie);
    expect(response.status).toBe(400);
  });

  it('4. Should fail if user is not project admin', async () => {
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ name: 'Hack' })
      .set('Cookie', memberCookie);
    expect(response.status).toBe(403);
  });

  it('5. Should fail for resource hierarchy mismatch', async () => {
    const otherProject = await seedProject('Other');
    const otherBoard = await seedBoard(otherProject.id, 'Other Board');
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    // Try to update other project's column through current project path
    const response = await request(app)
      .patch(
        `/api/projects/${projectId}/boards/${boardId}/columns/${otherCol!.id}`
      )
      .send({ name: 'Mismatch' })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(404);
  });

  it('6. Should fail if new wipLimit is less than current task count', async () => {
    // 1. Get the reporter ID (Yash)
    const yash = await prisma.user.findUnique({
      where: { username: '_yash_' },
    });

    // 2. Add 2 tasks to this specific column
    await prisma.task.createMany({
      data: [
        { title: 'Task 1', columnId, reporterId: yash!.id },
        { title: 'Task 2', columnId, reporterId: yash!.id },
      ],
    });

    // 3. Try to set WIP limit to 1 (which is < 2 tasks)
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ wipLimit: 1 })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(
      'Greater Than Existing No. of tasks'
    );

    // Cleanup for next tests if necessary
    await prisma.task.deleteMany({ where: { columnId } });
  });

  it('7.Should allow setting wipLimit to null even if tasks exist', async () => {
    // This tests the bug we discussed earlier (null < count)
    const response = await request(app)
      .patch(`/api/projects/${projectId}/boards/${boardId}/columns/${columnId}`)
      .send({ wipLimit: null })
      .set('Cookie', adminCookie);

    expect(response.status).toBe(200);
    expect(response.body.wipLimit).toBeNull();
  });
});
