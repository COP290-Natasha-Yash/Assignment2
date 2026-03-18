import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/tasks/:taskId/comments/:commentId',
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

    const commentId = req.params.commentId as string;
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        author: {
          select: { id: true, username: true, name: true, avatar: true },
        },
      },
    });
    if (!comment) {
      res
        .status(404)
        .json({ error: { message: 'Comment NOT Found', code: 'NOT_FOUND' } });
      return;
    }

    if (comment.taskId !== taskId) {
      res
        .status(404)
        .json({ error: { message: 'Comment NOT Found', code: 'NOT_FOUND' } });
      return;
    }

    res.status(200).json(comment);
  }
);

export default router;
