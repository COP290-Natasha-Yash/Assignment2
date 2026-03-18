import express, { Request, Response } from 'express';
import { prisma } from '../../prisma';
import { auditLog } from '../../utils/auditLog';
import { requireProjectRole } from '../../middleware/roles';
import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

router.patch(
  '/:id/boards/:boardId/tasks/:taskId/move',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;
    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res
        .status(404)
        .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (board.projectId !== projectId) {
      res
        .status(404)
        .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
      return;
    }

    const taskId = req.params.taskId as string;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res
        .status(404)
        .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
      return;
    }

    // check task belongs to this board
    const taskColumn = await prisma.column.findUnique({
      where: { id: task.columnId },
    });
    if (taskColumn?.boardId !== boardId) {
      res
        .status(404)
        .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (task.type === 'STORY') {
      res.status(400).json({
        error: {
          message: '"STORY" Type task is NOT Movable',
          code: 'INVALID_REQUEST',
        },
      });
      return;
    }

    const newColumnId = req.body.columnId;
    if (!newColumnId) {
      res.status(400).json({
        error: { message: 'New Column ID is Required', code: 'BAD_REQUEST' },
      });
      return;
    }

    const newColumn = await prisma.column.findUnique({
      where: { id: newColumnId },
    });
    if (!newColumn) {
      res
        .status(404)
        .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (newColumn.boardId !== boardId) {
      res.status(400).json({
        error: {
          message: 'Moving Tasks Between Different Boards Not Allowed',
          code: 'INVALID_REQUEST',
        },
      });
      return;
    }

    const currentColumn = await prisma.column.findUnique({
      where: { id: task.columnId },
    });
    if (
      Math.abs(currentColumn!.order - newColumn.order) !== 1 &&
      currentColumn!.name !== 'CLOSED' &&
      newColumn.name !== 'CLOSED'
    ) {
      res.status(400).json({
        error: {
          message:
            'This Column Transition is Not Allowed. Can Only Move to Adjacent Columns',
          code: 'INVALID_TRANSITION',
        },
      });
      return;
    }

    const taskCount = await prisma.task.count({
      where: { columnId: newColumnId },
    });
    if (newColumn.wipLimit && taskCount >= newColumn.wipLimit) {
      res.status(400).json({
        error: { message: 'WIP limit reached', code: 'WIP_LIMIT_REACHED' },
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        columnId: newColumnId,
        status: newColumn.name,
        resolvedAt: newColumn.name === 'DONE' ? new Date() : null,
        closedAt: newColumn.name === 'CLOSED' ? new Date() : null,
      },
    });

    if (task.status !== updatedTask.status) {
      await auditLog(
        taskId,
        req.userId!,
        'STATUS_CHANGED',
        task.status,
        updatedTask.status
      );
    }

    if (updatedTask.parentId) {
      const expectedStatus = await getExpectedStoryStatus(updatedTask.parentId);
      if (expectedStatus) {
        const storyTask = await prisma.task.findUnique({
          where: { id: updatedTask.parentId },
        });
        const oldStoryStatus = storyTask!.status;
        await prisma.task.update({
          where: { id: updatedTask.parentId },
          data: { status: expectedStatus },
        });
        if (oldStoryStatus !== expectedStatus) {
          await auditLog(
            updatedTask.parentId,
            req.userId!,
            'STATUS_CHANGED',
            oldStoryStatus,
            expectedStatus
          );
        }
      }
    }

    await auditLog(
      taskId,
      req.userId!,
      'STATUS_CHANGED',
      currentColumn!.name,
      newColumn.name
    );

    res.status(200).json(updatedTask);
  }
);

export default router;
