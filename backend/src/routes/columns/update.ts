import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/boards/:boardId/columns/:columnId',
  requireProjectRole(['ADMIN']),
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

    const { name, wipLimit } = req.body;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      res.status(400).json({
        error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
      });
      return;
    }

    if (wipLimit !== undefined && wipLimit !== null) {
      if (
        typeof wipLimit !== 'number' ||
        wipLimit < 0 ||
        !Number.isInteger(wipLimit)
      ) {
        res.status(400).json({
          error: {
            message: 'WIP Limit must be a positive integer or null',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      const taskCount = await prisma.task.count({ where: { columnId } });
      if (wipLimit < taskCount) {
        res.status(400).json({
          error: {
            message: 'WIP Limit Must Be Set Greater Than Existing No. of tasks',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }
    }

    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: { name, wipLimit },
    });

    res.status(200).json(updatedColumn);
  }
);

export default router;
