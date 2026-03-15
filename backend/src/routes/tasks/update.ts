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
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      res
        .status(404)
        .json({ error: { message: 'Project Not Found', code: 'NOT_FOUND' } });
      return;
    }

    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      res
        .status(404)
        .json({ error: { message: 'Board Not Found', code: 'NOT_FOUND' } });
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

    const taskId = req.params.taskId as string;
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res
        .status(404)
        .json({ error: { message: 'Task Not Found', code: 'NOT_FOUND' } });
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
      res
        .status(400)
        .json({
          error: {
            message: 'A "STORY" Cannot Have a Parent',
            code: 'BAD_REQUEST',
          },
        });
      return;
    }

    if (parentId) {
      const parent = await prisma.task.findUnique({ where: { id: parentId } });

      if (!parent) {
        res
          .status(400)
          .json({
            error: { message: 'Parent Task Not Found', code: 'BAD_REQUEST' },
          });
        return;
      }

      if (parent.type !== 'STORY') {
        res
          .status(400)
          .json({
            error: {
              message: 'Parent Task Must be a Story',
              code: 'BAD_REQUEST',
            },
          });
        return;
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
        res
          .status(400)
          .json({
            error: {
              message: 'Assignee Must Be a Project "ADMIN" or "MEMBER',
              code: 'BAD_REQUEST',
            },
          });
        return;
      }
    }

    if (dueDate) {
      const due = new Date(dueDate);
      if (due <= new Date()) {
        res
          .status(400)
          .json({
            error: {
              message: 'Due date must be in the future',
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
      resolvedAt?: Date;
      closedAt?: Date;
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

    if (status === 'CLOSED') {
      updatedData.closedAt = new Date();
    }
    if (status) {
      const newColumn = await prisma.column.findFirst({
        where: { boardId, name: status },
      });
      if (newColumn) {
        const taskCount = await prisma.task.count({
          where: { columnId: newColumn.id },
        });
        if (newColumn.wipLimit && taskCount >= newColumn.wipLimit) {
          res
            .status(400)
            .json({
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
          newColumn.name !== 'CLOSED'
        ) {
          res
            .status(400)
            .json({
              error: {
                message:
                  'This Column Transition is Not Allowed. Can Only Move to Adjacent Columns',
                code: 'INVALID_TRANSITION',
              },
            });
          return;
        }
        updatedData.columnId = newColumn.id;
      } else {
        res
          .status(404)
          .json({ error: { message: 'Column Not Found', code: 'NOT_FOUND' } });
        return;
      }

      if (task.type === 'STORY') {
        const expectedStatus = await getExpectedStoryStatus(taskId);
        if (expectedStatus && status !== expectedStatus) {
          res
            .status(400)
            .json({
              error: {
                message: 'Story status is inconsistent with children',
                code: 'INVALID_STATUS',
              },
            });
          return;
        }
      }
    }

    if (status === 'DONE') {
      updatedData.resolvedAt = new Date();
    }

    const updated_task = await prisma.task.update({
      where: { id: taskId },
      data: updatedData,
    });

    if (task.status !== updated_task.status) {
      if (updated_task.assigneeId) {
        await createNotification(
          updated_task.assigneeId,
          'Task Status Has Been Updated',
          taskId
        );
      }
    }

    if (task.assigneeId !== updated_task.assigneeId) {
      await auditLog(
        taskId,
        req.userId!,
        'ASIGNEE_CHANGED',
        task.assigneeId ?? 'none',
        updated_task.assigneeId ?? 'none'
      );

      if (updated_task.assigneeId) {
        await createNotification(
          updated_task.assigneeId,
          'You Have Been Assigned a Task',
          taskId
        );
      }
    }

    if (updated_task.parentId) {
      const expectedStatus = await getExpectedStoryStatus(
        updated_task.parentId
      );

      if (expectedStatus) {
        const storyTask = await prisma.task.findUnique({
          where: { id: updated_task.parentId },
        });
        const oldStoryStatus = storyTask!.status;

        await prisma.task.update({
          where: { id: updated_task.parentId },
          data: { status: expectedStatus },
        });

        if (oldStoryStatus !== expectedStatus) {
          await auditLog(
            updated_task.parentId,
            req.userId!,
            'STATUS_CHANGED',
            oldStoryStatus,
            expectedStatus
          );
        }
      }
    }

    res.status(200).json(updated_task);
  }
);

export default router;
