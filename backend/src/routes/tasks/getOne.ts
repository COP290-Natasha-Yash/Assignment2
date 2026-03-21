import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/boards/:boardId/columns/:columnId/tasks/:taskId — retrieves a single task
router.get(
  '/:id/boards/:boardId/columns/:columnId/tasks/:taskId',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Grabbing the board ID from the route params and verifying it exists
      const boardId = req.params.boardId as string;
      const board = await prisma.board.findUnique({ where: { id: boardId } });
      if (!board) {
        res
          .status(404)
          .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
        return;
      }

      // Making sure the board actually belongs to the given project
      if (board.projectId !== projectId) {
        res.status(404).json({
          error: {
            message: 'Board Not Found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      // Grabbing the column ID from the route params and verifying it exists
      const columnId = req.params.columnId as string;
      const column = await prisma.column.findUnique({
        where: { id: columnId },
      });
      if (!column) {
        res
          .status(404)
          .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
        return;
      }

      // Making sure the column actually belongs to the given board
      if (column.boardId !== boardId) {
        res.status(404).json({
          error: {
            message: 'Column Not Found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      // Grabbing the task ID from the route params and verifying it exists
      const taskId = req.params.taskId as string;
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        res
          .status(404)
          .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
        return;
      }

      // Making sure the task actually belongs to the given column
      if (task.columnId !== columnId) {
        res.status(404).json({
          error: {
            message: 'Task Not Found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      res.status(200).json(task);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get task error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
