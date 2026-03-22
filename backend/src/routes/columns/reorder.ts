import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/boards/:boardId/columns/reorder — updates the order of columns on a board
router.patch(
  '/:id/boards/:boardId/columns/reorder',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the columns array from the request body
      const columns = req.body;

      // Validating that a non-empty columns array was provided
      if (!columns || !Array.isArray(columns)) {
        res.status(400).json({
          error: { message: 'Columns Array is Required', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Validating that each column object has a valid id and order
      for (const col of columns) {
        if (
          !col.id ||
          typeof col.id !== 'string' ||
          typeof col.order !== 'number' ||
          !Number.isInteger(col.order)
        ) {
          res.status(400).json({
            error: {
              message: 'Each Column Must Have a Valid id and order',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // Preventing the CLOSED column (order: 99) from being reordered
      if (columns.some((col) => col.order === 99)) {
        res.status(403).json({
          error: {
            message: 'CLOSED Column Cannot Be Reordered',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

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


// Using a transaction to update all column orders atomically in a single pass
await prisma.$transaction(async (tx) => {
  // First pass: offset all orders by a large number to avoid unique constraint conflicts
  for (const col of columns) {
    await tx.column.update({
      where: { id: col.id },
      data: { order: col.order + 1000 },
    });
  }
  // Second pass: set the actual target orders
  for (const col of columns) {
    await tx.column.update({
      where: { id: col.id },
      data: { order: col.order },
    });
  }
});

      res.status(200).json({ message: 'Columns Reordered Successfully' });
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Reorder columns error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
