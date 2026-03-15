import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

const router = express.Router();

router.delete(
  '/:taskId/comments/:commentId',
  async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
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
