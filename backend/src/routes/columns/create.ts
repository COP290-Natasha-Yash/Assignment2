import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.post(
  '/:id/boards/:boardId/columns',
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

    const { name, wipLimit } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        error: {
          message: 'A Valid Board Name is Required',
          code: 'BAD_REQUEST',
        },
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
            message: 'WIP Limit Must be a Positive Integer or Null',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }
    }

    const existingColumns = await prisma.column.count({ where: { boardId } });

    const order = existingColumns + 1;

    const column = await prisma.column.create({
      data: { name, order, wipLimit, boardId },
    });

    res.status(201).json(column);
  }
);

export default router;
