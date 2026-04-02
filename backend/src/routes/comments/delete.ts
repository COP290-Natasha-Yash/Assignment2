import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing audit log utility to track comment deletion on tasks
import { auditLog } from '../../utils/auditLog';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles DELETE /:id/tasks/:taskId/comments/:commentId — deletes a comment from a task
router.delete(
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

      // Grabbing the authorId from the authenticate middleware
      const authorId = req.userId as string;

      // Only the author of the comment is allowed to delete it
      if (comment.authorId !== req.userId) {
        res.status(403).json({
          error: {
            message: 'You Can Only Delete Your Own Comments',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      // Deleting the comment from the DB
      await prisma.comment.delete({ where: { id: commentId } });

      // Logging the comment deletion in the audit log
      await auditLog(
        taskId,
        authorId,
        'COMMENT_DELETED',
        comment.content,
        undefined
      );

      res.status(200).json({ message: 'Comment Deleted Successfully' });
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Delete comment error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
