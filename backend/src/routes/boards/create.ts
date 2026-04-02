import express, { Request, Response } from 'express';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles POST /:id/boards — creates a new board with default columns for a project
router.post(
  '/:id/boards',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

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

      // Creating the board and its default columns together in a transaction
      const board = await prisma.$transaction(async (tx) => {
        // Creating the board in the DB under the given project
        const board = await tx.board.create({
          data: { name: name.trim(), projectId },
        });

        // Creating the default columns for the newly created board
        await tx.column.createMany({
          data: [
            { name: 'TO_DO', order: 1, boardId: board.id },
            { name: 'IN_PROGRESS', order: 2, boardId: board.id },
            { name: 'IN_REVIEW', order: 3, boardId: board.id },
            { name: 'DONE', order: 4, boardId: board.id },
            { name: 'CLOSED', order: 99, boardId: board.id },
          ],
        });

        return board;
      });

      // Returning the created board with a 201 status
      res.status(201).json(board);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Create board error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
