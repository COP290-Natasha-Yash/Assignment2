import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/tasks/:taskId/comments — retrieves all comments for a task
router.get(
  '/:id/tasks/:taskId/comments',
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

      // Fetching all comments for this task sorted by creation time ascending
      const comments = await prisma.comment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
      });

      res.status(200).json(comments);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get comments error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
