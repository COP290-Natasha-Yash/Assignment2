import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/boards/:boardId',
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

    const name = req.body.name;
    if (!name || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({
        error: {
          message: 'A Valid Board Name is Required',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const updatedBoard = await prisma.board.update({
      where: { id: boardId },
      data: { name },
    });

    res.status(200).json(updatedBoard);
  }
);

export default router;
