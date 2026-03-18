import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.delete(
  '/:id/tasks/:taskId/comments/:commentId',
  requireProjectRole(['ADMIN', 'MEMBER']),
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

    const authorId = req.userId as string;
    if (comment.authorId !== req.userId) {
      res.status(403).json({
        error: {
          message: 'You Can Only Delete Your Own Comments',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    await prisma.comment.delete({ where: { id: commentId } });

    await auditLog(
      taskId,
      authorId,
      'COMMENT_DELETED',
      comment.content,
      undefined
    );

    res.status(200).json({ message: 'Comment Deleted Successfully' });
  }
);

export default router;
