import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing audit log utility to track comment activity on tasks
import { auditLog } from '../../utils/auditLog';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/tasks/:taskId/comments/:commentId — updates a comment on a task
router.patch(
  '/:id/tasks/:taskId/comments/:commentId',
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

      // Grabbing the comment ID and verifying it exists
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

      // Making sure the comment actually belongs to the given task
      if (comment.taskId !== taskId) {
        res
          .status(404)
          .json({ error: { message: 'Comment NOT Found', code: 'NOT_FOUND' } });
        return;
      }

      // Only the author of the comment can update it
      if (comment.authorId !== req.userId) {
        res.status(403).json({
          error: { message: 'Forbidden', code: 'FORBIDDEN' },
        });
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

      // Updating the comment with the new content
      const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content: content.trim() },
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

      // Logging the comment update in the audit log
      await auditLog(taskId, req.userId!, 'COMMENT_EDITED', comment.content, content.trim());

      res.status(200).json(updatedComment);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update comment error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;