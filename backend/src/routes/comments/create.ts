import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing audit log utility to track comment activity on tasks
import { auditLog } from '../../utils/auditLog';

// Importing utility function to create notifications for users
import { createNotification } from '../../utils/createNotification';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles POST /:id/tasks/:taskId/comments — adds a comment to a task
router.post(
  '/:id/tasks/:taskId/comments',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Grabbing the task ID and verifying it belongs to this project
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

      // Validating that a non-empty comment was provided
      const content = req.body.content;
      if (!content || typeof content !== 'string' || !content.trim()) {
        res.status(400).json({
          error: { message: 'Comment is Required', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Grabbing the authorId from the authenticate middleware
      const authorId = req.userId as string;

      // Creating the comment and including the author's basic info in the response
      const comment = await prisma.comment.create({
        data: { content, taskId, authorId },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });

      // Logging the comment addition in the audit log
      await auditLog(taskId, authorId, 'COMMENT_ADDED', undefined, content);

      // Extracting @mentions from the comment content
      const mentions = content.match(/@(\w+)/g);
      if (mentions) {
        const usernames = mentions.map((m: string) => m.slice(1));

        // Finding all users that were mentioned by username
        const mentionedUsers = await prisma.user.findMany({
          where: { username: { in: usernames } },
          select: { id: true, username: true },
        });

        // Filter to only users who are actually members of this project
        const projectMemberIds = await prisma.projectMember.findMany({
          where: { projectId, userId: { in: mentionedUsers.map((u) => u.id) } },
          select: { userId: true },
        });

        const memberIdSet = new Set(projectMemberIds.map((m) => m.userId));

        // Notifying each mentioned user — skipping the author if they mention themselves
        for (const user of mentionedUsers) {
          if (user.id !== authorId && memberIdSet.has(user.id)) {
            await createNotification(
              user.id,
              `You Were Mentioned in a Comment: "${task.title}"`,
              task
            );
          }
        }
      }

      // Notifying the task assignee about the new comment — skipping if they are the author
      if (task.assigneeId && task.assigneeId !== authorId) {
        await createNotification(
          task.assigneeId,
          `New Comment on Your task: "${task.title}"`,
          task
        );
      }

      res.status(201).json(comment);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Create comment error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
