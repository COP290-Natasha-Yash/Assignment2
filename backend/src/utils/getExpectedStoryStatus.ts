import { prisma } from '../prisma';

export async function getExpectedStoryStatus(
  taskId: string
): Promise<string | null> {
  const parent = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: true },
  });

  if (!parent || !parent.column) {
    return null;
  }
  const boardId = parent.column.boardId;

  const children = await prisma.task.findMany({
    where: { parentId: taskId },
    include: { column: true },
  });
  if (children.length === 0) {
    return null;
  }

  const boardColumns = await prisma.column.findMany({
    where: { boardId: boardId },
    orderBy: { order: 'asc' },
  });
  if (boardColumns.length === 0) {
    return null;
  }

  const orders = children.map((child) => child.column.order);
  const minOrder = Math.min(...orders);
  const maxOrder = Math.max(...orders);

  const firstColOrder = boardColumns[0].order;
  const secondColumn =
    boardColumns.length >= 2 ? boardColumns[1] : boardColumns[0];

  if (minOrder === firstColOrder && maxOrder > firstColOrder) {
    return secondColumn.name;
  }
  const targetCol = boardColumns.find((col) => col.order === minOrder);
  return targetCol ? targetCol.name : null;
}
