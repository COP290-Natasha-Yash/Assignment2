import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.get('/:taskId/comments', async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    res
      .status(404)
      .json({ error: { message: 'Task NOT Found', code: 'NOT_FOUND' } });
    return;
  }

  const comments = await prisma.comment.findMany({ where: { taskId } });

  res.status(200).json(comments);
});

export default router;
