import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/boards/:boardId — updates the name of an existing board
router.patch(
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

      // Validating that a non-empty board name was provided in the request body
      const name = req.body.name;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          error: {
            message: 'A Valid Board Name is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Updating the board name in the DB with the trimmed value
      const updatedBoard = await prisma.board.update({
        where: { id: boardId },
        data: { name: name.trim() },
      });

      res.status(200).json(updatedBoard);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update board error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
