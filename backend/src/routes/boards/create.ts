import express, { Request, Response } from 'express';

import { requireProjectRole } from '../../middleware/roles';

import { prisma } from '../../prisma';

const router = express.Router();

router.post(
  '/:id/boards',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

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

    const board = await prisma.board.create({ data: { name, projectId } });

    await prisma.column.createMany({
      data: [
        { name: 'TO_DO', order: 1, boardId: board.id },
        { name: 'IN_PROGRESS', order: 2, boardId: board.id },
        { name: 'IN_REVIEW', order: 3, boardId: board.id },
        { name: 'DONE', order: 4, boardId: board.id },
        { name: 'CLOSED', order: 99, boardId: board.id },
      ],
    });

    res.status(201).json(board);
  }
);

export default router;
