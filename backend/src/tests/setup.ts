import { execSync } from 'child_process';
import { prisma } from '../prisma';

export default async function setup() {
  process.env.DATABASE_URL = 'file:./test.db';
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

export async function setupEach() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.column.deleteMany();
  await prisma.board.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}