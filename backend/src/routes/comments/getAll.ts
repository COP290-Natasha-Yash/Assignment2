import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/tasks/:taskId/comments',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    const taskId = req.params.taskId as string;
    const task = await prisma.task.findFirst({
      where: { id: taskId, column: { board: { projectId } } },
    });
    if (!task) {
      res
        .status(404)
        .json({ error: { message: 'Task NOT Found', code: 'NOT_FOUND' } });
      return;
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(comments);
  }
);

export default router;
