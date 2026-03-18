import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { createNotification } from '../../utils/createNotification';

const router = express.Router();

router.patch(
  '/:id/tasks/:taskId/comments/:commentId',
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

    const content = req.body.content;
    if (!content) {
      res.status(400).json({
        error: {
          message: 'Content is Required to Add Comment',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const authorId = req.userId as string;
    if (comment.authorId !== req.userId) {
      res.status(403).json({
        error: {
          message: 'You Can Only Edit Your Own Comments',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    const mentions = content.match(/@(\w+)/g);
    if (mentions) {
      for (const mention of mentions) {
        const username = mention.slice(1);
        const mentionedUser = await prisma.user.findUnique({
          where: { username },
        });
        if (mentionedUser) {
          await createNotification(
            mentionedUser.id,
            `You Were Mentioned in a Comment: "${content}"`,
            taskId
          );
        }
      }
    }

    const updated_comment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
    });

    await auditLog(
      taskId,
      authorId,
      'COMMENT_EDITED',
      comment.content,
      updated_comment.content
    );

    res.status(200).json(updated_comment);
  }
);

export default router;
