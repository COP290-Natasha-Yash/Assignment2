import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { createNotification } from '../../utils/createNotification';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.post(
  '/:id/tasks/:taskId/comments',
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

    const content = req.body.content;
    if (!content || !content.trim()) {
      res.status(400).json({
        error: { message: 'Comment is Required', code: 'BAD_REQUEST' },
      });
      return;
    }

    const authorId = req.userId as string;

    const comment = await prisma.comment.create({
      data: { content, taskId, authorId },
    });
    await auditLog(taskId, authorId, 'COMMENT_ADDED', undefined, content);

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
        `New Comment on Your task: "${content}"`,
        taskId
      );
    }

    res.status(201).json(comment);
  }
);

export default router;
