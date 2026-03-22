import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

// Importing utility to determine the expected status of a story based on its subtasks
// Needed so deleting a child task re-derives the parent story's status, same as update/move
import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

// Handles DELETE /:id/boards/:boardId/columns/:columnId/tasks/:taskId — deletes a task
router.delete(
  '/:id/boards/:boardId/columns/:columnId/tasks/:taskId',
  requireProjectRole(['ADMIN', 'MEMBER']),
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

      // Saving parentId BEFORE deletion — once the task is gone we can no longer read it,
      // but we still need it to re-derive the parent story's status from remaining siblings
      const parentId = task.parentId;

      // Deleting the task from the DB
      await prisma.task.delete({ where: { id: taskId } });

      // Now that the child is deleted, getExpectedStoryStatus will compute the
      // correct status from the remaining siblings — same pattern as update.ts/move.ts
      if (parentId) {
        const expectedStatus = await getExpectedStoryStatus(parentId);

        if (expectedStatus) {
          const storyTask = await prisma.task.findUnique({
            where: { id: parentId },
          });

          // Also update the story's columnId so it physically moves on the board
          const newStoryCol = await prisma.column.findFirst({
            where: { boardId, name: expectedStatus },
          });

          await prisma.task.update({
            where: { id: parentId },
            data: {
              status: expectedStatus,
              ...(newStoryCol && { columnId: newStoryCol.id }),
            },
          });
        }
      }
      res.status(200).json({ message: 'Task Deleted Successfully' });
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Delete task error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;