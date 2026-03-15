import { prisma } from '../prisma';

export async function getExpectedStoryStatus(
  taskId: string
): Promise<string | null> {
  const parent = await prisma.task.findUnique({ where: { id: taskId } });

  const children = await prisma.task.findMany({ where: { parentId: taskId } });
  if (children.length === 0) {
    return null;
  }

  const orders: number[] = [];
  for (const child of children) {
    const column = await prisma.column.findUnique({
      where: { id: child.columnId },
    });
    if (column) {
      orders.push(column.order);
    }
  }

  const parentColumn = await prisma.column.findUnique({
    where: { id: parent!.columnId },
  });
  const boardId = parentColumn!.boardId;

  const uniqueOrders = [...new Set(orders)].sort((a, b) => a - b);
  const storyOrder =
    uniqueOrders.length === 1 ? uniqueOrders[0] : uniqueOrders[1];
  const column = await prisma.column.findFirst({
    where: { order: storyOrder, boardId: boardId },
  });

  const expectedStatus = column!.name;

  return expectedStatus;
}
