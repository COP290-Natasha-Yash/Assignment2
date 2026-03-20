import { prisma } from '../prisma';

export async function createNotification(
  userId: string,
  message: string,
  task: { id: string; title: string }
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId,
      message,
      taskId: task.id,
      taskTitle: task.title,
    },
  });
}
