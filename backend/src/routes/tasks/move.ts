import express, { Request, Response } from 'express';
import { prisma } from '../../prisma';

// Importing audit log utility to track task status changes
import { auditLog } from '../../utils/auditLog';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

// Importing utility to determine the expected status of a story based on its subtasks
import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

// Handles PATCH /:id/boards/:boardId/tasks/:taskId/move — moves a task to a different column
router.patch(
  '/:id/boards/:boardId/tasks/:taskId/move',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID and board ID from the route params
      const projectId = req.params.id as string;
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
        res
          .status(404)
          .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
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

      // Verifying the task belongs to this board via its column
      const currentColumn = await prisma.column.findUnique({
        where: { id: task.columnId },
      });
      if (currentColumn?.boardId !== boardId) {
        res
          .status(404)
          .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
        return;
      }

      // STORY type tasks are not movable
      if (task.type === 'STORY') {
        res.status(400).json({
          error: {
            message: '"STORY" Type task is NOT Movable',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      // Validating that a new column ID was provided in the request body
      const newColumnId = req.body.columnId;
      if (!newColumnId) {
        res.status(400).json({
          error: { message: 'New Column ID is Required', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Looking up the new column to make sure it exists
      const newColumn = await prisma.column.findUnique({
        where: { id: newColumnId },
      });
      if (!newColumn) {
        res
          .status(404)
          .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
        return;
      }

      // Preventing tasks from being moved to columns on different boards
      if (newColumn.boardId !== boardId) {
        res.status(400).json({
          error: {
            message: 'Moving Tasks Between Different Boards Not Allowed',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      // Enforcing that tasks can only move to adjacent columns unless moving to/from CLOSED
      if (
        Math.abs(currentColumn!.order - newColumn.order) !== 1 &&
        currentColumn!.name !== 'CLOSED' &&
        newColumn.name !== 'CLOSED'
      ) {
        res.status(400).json({
          error: {
            message:
              'This Column Transition is Not Allowed. Can Only Move to Adjacent Columns',
            code: 'INVALID_TRANSITION',
          },
        });
        return;
      }

      // Checking if the new column has reached its WIP limit
      const taskCount = await prisma.task.count({
        where: { columnId: newColumnId, type: {not : 'STORY'
        } },
      });
      if (newColumn.wipLimit && taskCount >= newColumn.wipLimit) {
        res.status(400).json({
          error: { message: 'WIP Limit Reached', code: 'WIP_LIMIT_REACHED' },
        });
        return;
      }

      // Moving the task to the new column and updating its status and resolved/closed timestamps
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          columnId: newColumnId,
          status: newColumn.name,
          resolvedAt: newColumn.name === 'DONE' ? new Date() : null,
          closedAt: newColumn.name === 'CLOSED' ? new Date() : null,
        },
      });

      // Logging the status change audit if the status actually changed
      if (task.status !== updatedTask.status) {
        await auditLog(
          taskId,
          req.userId!,
          'STATUS_CHANGED',
          task.status,
          updatedTask.status
        );
      }

      // If the task has a parent story, updating the story's status based on its subtasks
      if (updatedTask.parentId) {
        const expectedStatus = await getExpectedStoryStatus(
          updatedTask.parentId
        );
        if (expectedStatus) {
          const storyTask = await prisma.task.findUnique({
            where: { id: updatedTask.parentId },
          });
          const oldStoryStatus = storyTask!.status;
          await prisma.task.update({
            where: { id: updatedTask.parentId },
            data: { status: expectedStatus },
          });

          // Logging the story status change audit if the status actually changed
          if (oldStoryStatus !== expectedStatus) {
            await auditLog(
              updatedTask.parentId,
              req.userId!,
              'STATUS_CHANGED',
              oldStoryStatus,
              expectedStatus
            );
          }
        }
      }

      res.status(200).json(updatedTask);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Move task error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
