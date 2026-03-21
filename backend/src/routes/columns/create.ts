import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles POST /:id/boards/:boardId/columns — creates a new column on a board
router.post(
  '/:id/boards/:boardId/columns',
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

      const { name, wipLimit } = req.body;

      // Validating that a non-empty column name was provided
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({
          error: {
            message: 'A Valid Column Name is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Validating wipLimit — must be a positive integer if provided
      if (wipLimit !== undefined && wipLimit !== null) {
        if (
          typeof wipLimit !== 'number' ||
          wipLimit < 0 ||
          !Number.isInteger(wipLimit)
        ) {
          res.status(400).json({
            error: {
              message: 'WIP Limit Must be a Positive Integer or Null',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // Counting existing columns to determine the order of the new column
      const existingColumns = await prisma.column.count({ where: { boardId } });

      // Placing the new column at the end of the current columns
      const order = existingColumns + 1;

      // Creating the new column on the board
      const column = await prisma.column.create({
        data: { name: name.trim(), order, wipLimit, boardId },
      });

      res.status(201).json(column);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Create column error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
