import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { auditLog } from '../../utils/auditLog';

import { createNotification } from '../../utils/createNotification';

import { requireProjectRole } from '../../middleware/roles';

import { getExpectedStoryStatus } from '../../utils/getExpectedStoryStatus';

const router = express.Router();

router.patch(
  '/:id/boards/:boardId/columns/:columnId/tasks/:taskId',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    const projectId = req.params.id as string;

    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res
        .status(404)
        .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (board.projectId !== projectId) {
      res.status(404).json({
        error: {
          message: 'Board Not Found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const columnId = req.params.columnId as string;
    const column = await prisma.column.findUnique({ where: { id: columnId } });
    if (!column) {
      res
        .status(404)
        .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (column.boardId !== boardId) {
      res.status(404).json({
        error: {
          message: 'Column Not Found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const taskId = req.params.taskId as string;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res
        .status(404)
        .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (task.columnId !== columnId) {
      res.status(404).json({
        error: {
          message: 'Task Not Found',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const {
      title,
      description,
      priority,
      type,
      status,
      assigneeId,
      reporterId,
      dueDate,
      parentId,
    } = req.body;

    if (type === 'STORY' && parentId) {
      res.status(400).json({
        error: {
          message: 'A "STORY" Cannot Have a Parent',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    if (parentId !== undefined) {
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
              message: 'Parent Task Must be a Story',
              code: 'BAD_REQUEST',
            },
          });
          return;
        }

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

    const updatedData: {
      title?: string;
      description?: string;
      priority?: string;
      type?: string;
      status?: string;
      assigneeId?: string;
      reporterId?: string;
      dueDate?: Date;
      columnId?: string;
      parentId?: string;
      resolvedAt?: Date | null;
      closedAt?: Date | null;
    } = {
      title,
      description,
      priority,
      type,
      status,
      assigneeId,
      reporterId,
      dueDate,
      parentId,
    };

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
      updatedData.dueDate = due;
    }

    if (status) {
      const newColumn = await prisma.column.findFirst({
        where: { boardId, name: status },
      });

      if (!newColumn) {
        res
          .status(404)
          .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
        return;
      }
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

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updatedData,
    });

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
          taskId
        );
      }
    }

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
          taskId
        );
      }
    }

    if (updatedTask.parentId) {
      const expectedStatus = await getExpectedStoryStatus(updatedTask.parentId);

      if (expectedStatus) {
        const storyTask = await prisma.task.findUnique({
          where: { id: updatedTask.parentId },
        });
        const oldStoryStatus = storyTask!.status;

        await prisma.task.update({
          where: { id: updatedTask.parentId },
          data: { status: expectedStatus },
        });

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
  }
);

export default router;
