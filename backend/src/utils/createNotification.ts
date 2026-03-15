import { prisma } from '../prisma';

export async function createNotification(
  userId: string,
  message: string,
  taskId: string
): Promise<void> {
  await prisma.notification.create({ data: { userId, message, taskId } });
}
