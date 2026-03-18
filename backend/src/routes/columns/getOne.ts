import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/boards/:boardId/columns/:columnId',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
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

    res.status(200).json(column);
  }
);

export default router;
