import { prisma } from '../prisma';

// Utility function to create an audit log entry for a task action
export async function auditLog(
  taskId: string,
  userId: string,
  action: string,
  // Old value is optional — not all actions have a previous state
  oldValue?: string,
  // New value is optional — not all actions have a new state (e.g. deletions)
  newValue?: string
): Promise<void> {
  // Creating the audit log entry in the DB
  await prisma.auditLog.create({
    data: { taskId, userId, action, oldValue, newValue },
  });
}
