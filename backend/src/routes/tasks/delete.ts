import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.delete(
  '/:id/boards/:boardId/columns/:columnId/tasks/:taskId',
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
      res.status(404).json({
        error: {
          message: 'Board Not Found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const columnId = req.params.columnId as string;
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column) {
      res
        .status(404)
        .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (column.boardId !== boardId) {
      res.status(404).json({
        error: {
          message: 'Column Not Found',
          code: 'NOT_FOUND',
        },
      });
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

    if (task.columnId !== columnId) {
      res.status(404).json({
        error: {
          message: 'Task Not Found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    //OPTION- A
    //    const subTasks = await prisma.task.findMany({ where: { parentId: taskId } });
    //    if (subTasks.length > 0) {
    //        res.status(400).json({ error: { message: 'Cannot Delete a Story With Subtasks', code: 'BAD_REQUEST' } });
    //        return;
    //    }

    //    await prisma.task.delete({ where: { id: taskId } });

    //OPTION-B
    //    await prisma.task.deleteMany({ where: { parentId: taskId } });

    await prisma.task.delete({ where: { id: taskId } });

    res.status(200).json({ message: 'Task Deleted Successfully' });
  }
);

export default router;
