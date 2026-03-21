import { prisma } from '../prisma';

// Utility function to create a notification for a user about a task event
export async function createNotification(
  userId: string,
  message: string,
  // Only requiring the fields we actually need from the task
  task: { id: string; title: string }
): Promise<void> {
  // Creating the notification entry in the DB
  await prisma.notification.create({
    data: {
      userId,
      message,
      taskId: task.id,
      taskTitle: task.title,
    },
  });
}
