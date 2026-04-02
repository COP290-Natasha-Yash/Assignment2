import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

// Importing utility function to create notifications for users
import { createNotification } from '../../utils/createNotification';

// Importing utility to determine the expected status of a story based on its subtasks
// Needed so creating a child task re-derives the parent story's status, same as update/move
import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

// Handles POST /:id/boards/:boardId/columns/:columnId/tasks — creates a new task in a column
router.post(
  '/:id/boards/:boardId/columns/:columnId/tasks',
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

      // Checking if the column has reached its WIP limit before allowing a new task
      const taskCount = await prisma.task.count({
        where: { columnId, type: { not: 'STORY' } },
      });
      if (column.wipLimit && taskCount >= column.wipLimit) {
        res.status(400).json({
          error: {
            message: 'WIP LIMIT REACHED -- CANNOT CREATE A NEW TASK',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      const {
        title,
        description,
        priority,
        type,
        assigneeId,
        dueDate,
        parentId,
      } = req.body;

      // Setting the task status to the column name
      const status = column.name;

      // Validating that a non-empty title was provided
      if (!title || typeof title !== 'string' || !title.trim()) {
        res.status(400).json({
          error: {
            message: 'Title is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // If description is provided, making sure it's a valid string
      if (description && typeof description !== 'string') {
        res.status(400).json({
          error: {
            message: 'Valid Description is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // If priority is provided, making sure it's a valid value
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      if (priority && !validPriorities.includes(priority)) {
        res.status(400).json({
          error: { message: 'Invalid Priority', code: 'BAD_REQUEST' },
        });
        return;
      }

      // If type is provided, making sure it's a valid value
      const validTypes = ['STORY', 'TASK', 'BUG'];
      if (type && !validTypes.includes(type)) {
        res.status(400).json({
          error: { message: 'Invalid Task Type', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Grabbing the reporterId from the authenticate middleware
      const reporterId = req.userId as string;

      // Preventing a STORY from having a parent task
      if (type === 'STORY' && parentId) {
        res.status(400).json({
          error: {
            message: 'A "STORY" Cannot Have a Parent',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Validating assigneeId is a string if provided
      if (assigneeId && typeof assigneeId !== 'string') {
        res.status(400).json({
          error: { message: 'Invalid Assignee ID', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Validating parentId is a string if provided
      if (parentId && typeof parentId !== 'string') {
        res.status(400).json({
          error: { message: 'Invalid Parent ID', code: 'BAD_REQUEST' },
        });
        return;
      }

      // If a parentId is provided, validating the parent task exists and is a STORY on the same board
      if (parentId) {
        const parent = await prisma.task.findUnique({
          where: { id: parentId },
          include: { column: true },
        });

        if (!parent) {
          res.status(400).json({
            error: { message: 'Parent Task Not Found', code: 'BAD_REQUEST' },
          });
          return;
        }

        if (parent.type !== 'STORY') {
          res.status(400).json({
            error: {
              message: 'Parent Task Must Be a Story',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }

        // Making sure the parent task is on the same board
        if (parent.column.boardId !== boardId) {
          res.status(400).json({
            error: {
              message: 'Parent Task Must Be On The Same Board',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // If an assigneeId is provided, making sure they are an ADMIN or MEMBER of the project
      if (assigneeId) {
        const asigneeMember = await prisma.projectMember.findFirst({
          where: {
            userId: assigneeId,
            projectId,
            role: { in: ['ADMIN', 'MEMBER'] },
          },
        });
        if (!asigneeMember) {
          res.status(400).json({
            error: {
              message: 'Assignee Must Be a Project "ADMIN" or "MEMBER"',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // If a dueDate is provided, validating it's a valid future date
      if (dueDate) {
        const due = new Date(dueDate);
        if (isNaN(due.getTime())) {
          return res.status(400).json({
            error: { message: 'Invalid Date Format', code: 'BAD_REQUEST' },
          });
        }
        if (due <= new Date()) {
          return res.status(400).json({
            error: {
              message: 'Due Date Must Be in The Future',
              code: 'BAD_REQUEST',
            },
          });
        }
      }

      // Creating the task in the DB
      const task = await prisma.task.create({
        data: {
          title,
          description,
          priority,
          type,
          status,
          assigneeId,
          reporterId,
          dueDate,
          columnId,
          parentId,
        },
      });

      // Sending a notification to the assignee if one was provided
      if (task.assigneeId) {
        await createNotification(
          task.assigneeId,
          `You Have Been Assigned a Task: ${task.title}`,
          task
        );
      }


      // If this new task belongs to a parent story, recalculate the story's
      // status based on all its children — same pattern as update.ts and move.ts.
      // Without this, creating a child task would leave the story status stale.
      if (task.parentId) {
        const expectedStatus = await getExpectedStoryStatus(task.parentId);

        if (expectedStatus) {
          const storyTask = await prisma.task.findUnique({
            where: { id: task.parentId },
          });
          const oldStoryStatus = storyTask!.status;

          // Also update the story's columnId so it physically moves on the board
          const newStoryCol = await prisma.column.findFirst({
            where: { boardId, name: expectedStatus },
          });

          await prisma.task.update({
            where: { id: task.parentId },
            data: {
              status: expectedStatus,
              ...(newStoryCol && { columnId: newStoryCol.id }),
            },
          });
        }
      }

      res.status(201).json(task);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Create task error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;