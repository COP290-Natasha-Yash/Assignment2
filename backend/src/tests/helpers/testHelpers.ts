import { prisma } from '../../prisma';
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from '../../index';

export async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

export async function seedAdmin() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  return await prisma.user.create({
    data: {
      name: 'Global Admin',
      email: 'admin@taskboard.com',
      username: 'admin',
      password: hashedPassword,
      globalRole: 'GLOBAL_ADMIN',
    },
  });
}

export async function seedUser(
  name: string,
  email: string,
  username: string,
  password: string
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return await prisma.user.create({
    data: { name, email, username, password: hashedPassword },
  });
}

export async function seedProject(name: string = 'Test Project') {
  return await prisma.project.create({
    data: { name },
  });
}

export async function seedBoard(
  projectId: string,
  name: string = 'Test Board'
) {
  const board = await prisma.board.create({
    data: { name, projectId },
  });

  const defaultColumns = [
    'TO_DO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE',
    'CLOSED',
  ];

  await prisma.column.createMany({
    data: defaultColumns.map((name, index) => ({
      name,
      order: index + 1,
      boardId: board.id,
    })),
  });

  return board;
}

export async function seedColumn(boardId: string, name: string, order: number) {
  return await prisma.column.create({
    data: { name, order, boardId },
  });
}

export async function addMember(
  userId: string,
  projectId: string,
  role: string
) {
  return await prisma.projectMember.create({
    data: { userId, projectId, role },
  });
}

export async function loginUser(username: string, password: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  return response.headers['set-cookie'];
}

export async function seedTask(
  columnId: string,
  reporterId: string,
  title: string = 'Test Task',
  type: string = 'TASK',
  parentId?: string
) {
  return await prisma.task.create({
    data: { title, type, columnId, reporterId, parentId },
  });
}

export async function seedStoryTask(
  columnId: string,
  reporterId: string,
  title: string = 'Test Story'
) {
  return await prisma.task.create({
    data: { title, type: 'STORY', columnId, reporterId },
  });
}
