import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/tasks/:taskId/comments/:commentId — retrieves a single comment on a task
router.get(
  '/:id/tasks/:taskId/comments/:commentId',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
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

      // Grabbing the comment ID and verifying it exists, including the author's basic info
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

      // Making sure the comment actually belongs to the given task
      if (comment.taskId !== taskId) {
        res
          .status(404)
          .json({ error: { message: 'Comment NOT Found', code: 'NOT_FOUND' } });
        return;
      }

      res.status(200).json(comment);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get comment error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
