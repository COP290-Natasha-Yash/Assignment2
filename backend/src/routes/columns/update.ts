import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/boards/:boardId/columns/:columnId — updates a column's name and/or WIP limit
router.patch(
  '/:id/boards/:boardId/columns/:columnId',
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

      const { name, wipLimit } = req.body;

      // If name is provided, making sure it's a non-empty string
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        res.status(400).json({
          error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
        });
        return;
      }

      // If wipLimit is provided, validating it's a positive integer
      if (wipLimit !== undefined && wipLimit !== null) {
        if (
          typeof wipLimit !== 'number' ||
          wipLimit < 0 ||
          !Number.isInteger(wipLimit)
        ) {
          res.status(400).json({
            error: {
              message: 'WIP Limit must be a positive integer or null',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }

        // Making sure the new WIP limit isn't less than the current number of tasks in the column
        const taskCount = await prisma.task.count({ where: { columnId } });
        if (wipLimit < taskCount) {
          res.status(400).json({
            error: {
              message:
                'WIP Limit Must Be Set Greater Than Existing No. of tasks',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // Updating only the fields that were actually provided in the request
      const updatedColumn = await prisma.column.update({
        where: { id: columnId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(wipLimit !== undefined && { wipLimit }),
        },
      });

      res.status(200).json(updatedColumn);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update column error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
