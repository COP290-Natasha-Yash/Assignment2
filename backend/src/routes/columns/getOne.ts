import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/boards/:boardId/columns/:columnId — retrieves a single column from a board
router.get(
  '/:id/boards/:boardId/columns/:columnId',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Grabbing the board ID from the route params
      const boardId = req.params.boardId as string;

      // Looking up the board to make sure it exists
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

      // Grabbing the column ID from the route params
      const columnId = req.params.columnId as string;

      // Looking up the column to make sure it exists
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

      res.status(200).json(column);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get column error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
