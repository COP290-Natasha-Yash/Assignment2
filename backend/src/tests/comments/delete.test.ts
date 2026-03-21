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
let memberId: string;
let projectId: string;
let taskId: string;
let adminCommentId: string;
let memberCommentId: string;

beforeAll(async () => {
  await clearDatabase();

  // 1. Setup Users
  const admin = await seedAdmin();
  adminId = admin.id;

  const member = await prisma.user.create({
    data: {
      name: 'Member',
      email: 'member@example.com',
      password: 'hashedpassword',
      username: 'memberuser',
    },
  });
  memberId = member.id;

  // 2. Setup Project, Board, Column, and Task
  const project = await seedProject('Comment Deletion Project');
  projectId = project.id;
  await addMember(adminId, projectId, 'ADMIN');
  await addMember(memberId, projectId, 'MEMBER');

  const board = await seedBoard(projectId);
  const column = await prisma.column.findFirst({
    where: { boardId: board.id },
  });

  const task = await prisma.task.create({
    data: {
      title: 'Discussion Task',
      columnId: column!.id,
      reporterId: adminId,
    },
  });
  taskId = task.id;

  // 3. Login Users (Assuming your helper generates tokens/cookies)
  adminCookie = await loginUser('admin', 'admin123');

  // Note: Adjust loginUser helper usage if it doesn't take raw passwords easily.
  // For the sake of the test, we assume memberCookie is properly authenticated as 'memberId'
});

beforeEach(async () => {
  // Clear logs and comments before each test to prevent interference
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();

  // Seed two comments for testing permissions
  const adminComment = await prisma.comment.create({
    data: { content: 'Admin wrote this', taskId, authorId: adminId },
  });
  adminCommentId = adminComment.id;

  const memberComment = await prisma.comment.create({
    data: { content: 'Member wrote this', taskId, authorId: memberId },
  });
  memberCommentId = memberComment.id;
});

afterAll(async () => {
  await clearDatabase();
});

describe('DELETE /api/projects/:id/tasks/:taskId/comments/:commentId', () => {
  it('1. should allow the author to delete their own comment and log COMMENT_DELETED', async () => {
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/tasks/${taskId}/comments/${adminCommentId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Comment Deleted Successfully');

    // Verify it's gone from the DB
    const deletedComment = await prisma.comment.findUnique({
      where: { id: adminCommentId },
    });
    expect(deletedComment).toBeNull();

    // Verify the Audit Log
    const log = await prisma.auditLog.findFirst({
      where: { taskId, action: 'COMMENT_DELETED' },
    });
    expect(log).toBeDefined();
    expect(log?.userId).toBe(adminId);
    expect(log?.oldValue).toBe('Admin wrote this');
    expect(log?.newValue).toBeNull(); // or undefined depending on your DB schema mapping
  });

  it("2. should return 403 FORBIDDEN if a user tries to delete someone else's comment", async () => {
    // Admin tries to delete the Member's comment (Strict Rubric Rule)
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/tasks/${taskId}/comments/${memberCommentId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe(
      'You Can Only Delete Your Own Comments'
    );

    // Verify it was NOT deleted
    const preservedComment = await prisma.comment.findUnique({
      where: { id: memberCommentId },
    });
    expect(preservedComment).not.toBeNull();
  });

  it('3. should return 404 if the task belongs to a different project (IDOR Protection)', async () => {
    const otherProject = await seedProject('Other Project');
    const otherBoard = await seedBoard(otherProject.id);
    const otherCol = await prisma.column.findFirst({
      where: { boardId: otherBoard.id },
    });

    // Create a task in the OTHER project
    const otherTask = await prisma.task.create({
      data: {
        title: 'Other Task',
        columnId: otherCol!.id,
        reporterId: adminId,
      },
    });

    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/tasks/${otherTask.id}/comments/${adminCommentId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Task NOT Found');
  });

  it('4. should return 404 if the comment does not belong to the specified task', async () => {
    // Create a second task in the SAME project
    const col = await prisma.column.findFirst({
      where: { board: { projectId } },
    });
    const secondTask = await prisma.task.create({
      data: { title: 'Task Two', columnId: col!.id, reporterId: adminId },
    });

    // Try to delete adminComment (which belongs to taskId) via secondTask's URL
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/tasks/${secondTask.id}/comments/${adminCommentId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('Comment NOT Found');
  });

  it('5. should return 404 if the comment does not exist', async () => {
    const fakeCommentId = 'cm00000000000000000000000'; // Assuming cuid/uuid format
    const res = await request(app)
      .delete(
        `/api/projects/${projectId}/tasks/${taskId}/comments/${fakeCommentId}`
      )
      .set('Cookie', adminCookie);

    expect(res.status).toBe(404);
  });
});
