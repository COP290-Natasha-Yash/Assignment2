import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles DELETE /:id/boards/:boardId — deletes a board from a project
router.delete(
  '/:id/boards/:boardId',
  requireProjectRole(['ADMIN']),
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

      // Deleting the board from the DB
      await prisma.board.delete({ where: { id: boardId } });

      res.status(200).json({ message: 'Board Deleted Successfully' });
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Delete board error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
