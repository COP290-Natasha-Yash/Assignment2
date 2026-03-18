import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { createNotification } from '../../utils/createNotification';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/tasks/:taskId/comments/:commentId', requireProjectRole(['ADMIN','MEMBER']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    const taskId = req.params.taskId as string;
    const task = await prisma.task.findUnique({
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

    const content = req.body.content;
    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({
        error: { message: 'Comment is Required', code: 'BAD_REQUEST' },
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
      const usernames = mentions.map((m: string) => m.slice(1));

      const mentionedUsers = await prisma.user.findMany({
        where: { username: { in: usernames } },
        select: { id: true, username: true },
      });

      for (const user of mentionedUsers) {
        // Don't notify the author if they weirdly mention themselves
        if (user.id !== authorId) {
          await createNotification(
            user.id,
            `You Were Mentioned in a Comment: "${content}"`,
            taskId
          );
        }
      }
    }

    if (task.assigneeId && task.assigneeId !== authorId) {
      await createNotification(
        task.assigneeId,
        `Comment Updated on Your task: "${content}"`,
        taskId
      );
    }

    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content },
    });

    await auditLog(
      taskId,
      authorId,
      'COMMENT_EDITED',
      comment.content,
      updatedComment.content
    );

    res.status(200).json(updatedComment);
  }
);

export default router;
