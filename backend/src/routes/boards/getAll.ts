import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/boards',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    const boards = await prisma.board.findMany({ where: { projectId } });

    res.status(200).json(boards);
  }
);

export default router;
