import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { createNotification } from '../../utils/createNotification';

const router = express.Router();

router.post('/:taskId/comments', async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    res
      .status(404)
      .json({ error: { message: 'Task NOT Found', code: 'NOT_FOUND' } });
    return;
  }

  const content = req.body.content;
  if (!content) {
    res
      .status(400)
      .json({ error: { message: 'Comment is Required', code: 'BAD_REQUEST' } });
    return;
  }

  const authorId = req.userId as string;

  const comment = await prisma.comment.create({
    data: { content, taskId, authorId },
  });

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

  await auditLog(taskId, authorId, 'COMMENT_ADDED', undefined, content);

  if (task.assigneeId) {
    await createNotification(
      task.assigneeId,
      `New Comment on Your task: "${content}"`,
      taskId
    );
  }

  res.status(201).json(comment);
});

export default router;
