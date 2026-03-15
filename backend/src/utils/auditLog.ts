import { prisma } from '../prisma';

export async function auditLog(
  taskId: string,
  userId: string,
  action: string,
  oldValue?: string,
  newValue?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: { taskId, userId, action, oldValue, newValue },
  });
}
