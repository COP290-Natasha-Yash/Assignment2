import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing audit log utility to track task field changes
import { auditLog } from '../../utils/auditLog';

// Importing utility function to create notifications for users
import { createNotification } from '../../utils/createNotification';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

// Importing utility to determine the expected status of a story based on its subtasks
import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

// Handles PATCH /:id/boards/:boardId/columns/:columnId/tasks/:taskId — updates a task's fields
router.patch(
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

      // Destructuring request body — reporterId is intentionally excluded as it should never change
      const {
        title,
        description,
        priority,
        type,
        status,
        assigneeId,
        dueDate,
        parentId,
      } = req.body;

      // Validating dueDate before building updatedData
      let actualDue: Date | undefined;
      if (dueDate) {
        const due = new Date(dueDate);
        if (isNaN(due.getTime())) {
          res.status(400).json({
            error: { message: 'Invalid Date Format', code: 'BAD_REQUEST' },
          });
          return;
        }
        if (due <= new Date()) {
          res.status(400).json({
            error: {
              message: 'Due Date Must Be In The Future',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
        actualDue = due;
      }

      // Preventing type change from STORY to TASK/BUG if subtasks exist
      if (type && type !== 'STORY' && task.type === 'STORY') {
        const childCount = await prisma.task.count({
          where: { parentId: taskId },
        });
        if (childCount > 0) {
          res.status(400).json({
            error: {
              message: 'Cannot Change Type to TASK While Subtasks Exist',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

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

      // Validating the parentId if provided
      if (parentId !== undefined) {
        // A task cannot be its own parent
        if (parentId === taskId) {
          res.status(400).json({
            error: {
              message: 'A Task Cannot be Its Own Parent',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }

        if (parentId !== null) {
          // Looking up the parent task to make sure it exists and is valid
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

          // Parent task must be a STORY
          if (parent.type !== 'STORY') {
            res.status(400).json({
              error: {
                message: 'Parent Task Must be a Story',
                code: 'BAD_REQUEST',
              },
            });
            return;
          }

          // Parent task must be on the same board
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
      }

      // If an assigneeId is provided, making sure they are an ADMIN or MEMBER of the project
      if (assigneeId) {
        const member = await prisma.projectMember.findFirst({
          where: {
            userId: assigneeId,
            projectId,
            role: { in: ['ADMIN', 'MEMBER'] },
          },
        });
        if (!member) {
          res.status(400).json({
            error: {
              message: 'Assignee Must Be a Project "ADMIN" or "MEMBER"',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }
      }

      // Building the update object using spread to only include fields that were actually provided
      const updatedData: {
        title?: string;
        description?: string;
        priority?: string;
        type?: string;
        status?: string;
        assigneeId?: string;
        dueDate?: Date;
        columnId?: string;
        parentId?: string;
        resolvedAt?: Date | null;
        closedAt?: Date | null;
      } = {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(type !== undefined && { type }),
        ...(status !== undefined && { status }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(actualDue !== undefined && { dueDate: actualDue }),
        ...(parentId !== undefined && { parentId }),
      };

      // If status is being updated, validating the transition and WIP limit
      if (status) {
        // Finding the new column by name on the same board
        const newColumn = await prisma.column.findFirst({
          where: { boardId, name: status },
        });

        if (!newColumn) {
          res.status(404).json({
            error: { message: 'Column Not Found', code: 'NOT_FOUND' },
          });
          return;
        }

        // Checking WIP limit on the new column
        const taskCount = await prisma.task.count({
          where: { columnId: newColumn.id },
        });
        if (
          newColumn.wipLimit &&
          taskCount >= newColumn.wipLimit &&
          newColumn.id !== task.columnId
        ) {
          res.status(400).json({
            error: {
              message: 'WIP limit reached',
              code: 'WIP_LIMIT_REACHED',
            },
          });
          return;
        }

        // Enforcing that tasks can only move to adjacent columns unless moving to/from CLOSED
        if (
          Math.abs(column!.order - newColumn.order) !== 1 &&
          column.name !== 'CLOSED' &&
          newColumn.name !== 'CLOSED' &&
          column.id !== newColumn.id
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

        // Updating the columnId and resolved/closed timestamps based on the new status
        updatedData.columnId = newColumn.id;
        updatedData.resolvedAt =
          status === 'DONE'
            ? new Date()
            : task.status === 'DONE'
              ? null
              : undefined;
        updatedData.closedAt =
          status === 'CLOSED'
            ? new Date()
            : task.status === 'CLOSED'
              ? null
              : undefined;

        // For STORY tasks, making sure the new status is consistent with its children's statuses
        if (task.type === 'STORY') {
          const expectedStatus = await getExpectedStoryStatus(taskId);
          if (expectedStatus && status !== expectedStatus) {
            res.status(400).json({
              error: {
                message: 'Story Status is Inconsistent With Children',
                code: 'INVALID_STATUS',
              },
            });
            return;
          }
        }
      }

      // Saving the updated task to the DB
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: updatedData,
      });

      // Logging and notifying if the task status changed
      if (task.status !== updatedTask.status) {
        await auditLog(
          taskId,
          req.userId!,
          'STATUS_CHANGED',
          task.status,
          updatedTask.status
        );

        if (updatedTask.assigneeId) {
          await createNotification(
            updatedTask.assigneeId,
            'Task Status Has Been Updated',
            task
          );
        }
      }

      // Logging and notifying if the assignee changed
      if (task.assigneeId !== updatedTask.assigneeId) {
        await auditLog(
          taskId,
          req.userId!,
          'ASSIGNEE_CHANGED',
          task.assigneeId ?? 'none',
          updatedTask.assigneeId ?? 'none'
        );

        if (updatedTask.assigneeId) {
          await createNotification(
            updatedTask.assigneeId,
            'You Have Been Assigned a Task',
            task
          );
        }
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

          // Logging the story status change if it actually changed
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

      // If the task was moved away from a parent story, updating the old story's status
      if (task.parentId && task.parentId !== updatedTask.parentId) {
        const oldExpected = await getExpectedStoryStatus(task.parentId);
        if (oldExpected) {
          const storyTask = await prisma.task.findUnique({
            where: { id: task.parentId },
          });
          const oldStoryStatus = storyTask!.status;

          await prisma.task.update({
            where: { id: task.parentId },
            data: { status: oldExpected },
          });

          // Logging the old story status change if it actually changed
          if (oldStoryStatus !== oldExpected) {
            await auditLog(
              task.parentId,
              req.userId!,
              'STATUS_CHANGED',
              oldStoryStatus,
              oldExpected
            );
          }
        }
      }

      res.status(200).json(updatedTask);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update task error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
