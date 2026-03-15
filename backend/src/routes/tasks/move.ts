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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      res
        .status(404)
        .json({ error: { message: 'Project Not Found', code: 'NOT_FOUND' } });
      return;
    }

    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
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

    if (task.type === 'STORY') {
      res
        .status(400)
        .json({
          error: {
            message: '"STORY" Type task is NOT Movable',
            code: 'INVALID_REQUEST',
          },
        });
      return;
    }

    const newColumnId = req.body.columnId;
    if (!newColumnId) {
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
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
      res
        .status(400)
        .json({
          error: { message: 'WIP limit reached', code: 'WIP_LIMIT_REACHED' },
        });
      return;
    }

    if (newColumn.name === 'DONE') {
      await prisma.task.update({
        where: { id: taskId },
        data: { resolvedAt: new Date() },
      });
    }

    const updated_task = await prisma.task.update({
      where: { id: taskId },
      data: { columnId: newColumnId },
    });

    if (updated_task.parentId) {
      const expectedStatus = await getExpectedStoryStatus(
        updated_task.parentId
      );

      if (expectedStatus) {
        const storyTask = await prisma.task.findUnique({
          where: { id: updated_task.parentId },
        });
        const oldStoryStatus = storyTask!.status;

        await prisma.task.update({
          where: { id: updated_task.parentId },
          data: { status: expectedStatus },
        });

        if (oldStoryStatus !== expectedStatus) {
          await auditLog(
            updated_task.parentId,
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

    res.status(200).json(updated_task);
  }
);

export default router;
