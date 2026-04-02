import { prisma } from '../prisma';

// Utility function that determines what status a story should have based on its children's statuses
export async function getExpectedStoryStatus(
  taskId: string
): Promise<string | null> {
  // Looking up the parent story and its column
  const parent = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: true },
  });

  // If the parent or its column doesn't exist, we can't determine a status
  if (!parent || !parent.column) {
    return null;
  }
  const boardId = parent.column.boardId;

  // Fetching all child tasks of this story along with their columns
  const children = await prisma.task.findMany({
    where: { parentId: taskId },
    include: { column: true },
  });

  // If there are no children, there's no expected status to derive
  if (children.length === 0) {
    return null;
  }

  // Fetching all columns on this board sorted by order ascending
  const boardColumns = await prisma.column.findMany({
    where: { boardId: boardId },
    orderBy: { order: 'asc' },
  });
  if (boardColumns.length === 0) {
    return null;
  }

  // Finding the min and max order among all children's columns
  const orders = children.map((child) => child.column.order);
  const minOrder = Math.min(...orders);
  const maxOrder = Math.max(...orders);

  const firstColOrder = boardColumns[0].order;
  const secondColumn =
    boardColumns.length >= 2 ? boardColumns[1] : boardColumns[0];

  // If some children are in the first column and others are further ahead,
  // the story is considered to be in progress — use the second column's name
  if (minOrder === firstColOrder && maxOrder > firstColOrder) {
    return secondColumn.name;
  }

  // Otherwise the story's status matches the column of the least progressed child
  const targetCol = boardColumns.find((col) => col.order === minOrder);
  return targetCol ? targetCol.name : null;
}
