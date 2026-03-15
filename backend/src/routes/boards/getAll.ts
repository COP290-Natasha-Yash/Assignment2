import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.get('/:id/boards', async (req: Request, res: Response) => {
  const projectId = req.params.id as string;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    res
      .status(404)
      .json({ error: { message: 'Project Not Found', code: 'NOT_FOUND' } });
    return;
  }

  const boards = await prisma.board.findMany({ where: { projectId } });

  res.status(200).json(boards);
});

export default router;
