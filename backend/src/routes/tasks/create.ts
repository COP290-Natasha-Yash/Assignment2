import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.post(
  '/:id/boards/:boardId/columns/:columnId/tasks',
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

    const taskCount = await prisma.task.count({ where: { columnId } });
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
      reporterId,
      dueDate,
      parentId,
    } = req.body;

    const status = column.name;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({
        error: {
          message: 'Title is Required',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    if (priority && !validPriorities.includes(priority)) {
      res
        .status(400)
        .json({ error: { message: 'Invalid priority', code: 'BAD_REQUEST' } });
      return;
    }

    const validTypes = ['STORY', 'TASK', 'BUG'];
    if (type && !validTypes.includes(type)) {
      res
        .status(400)
        .json({ error: { message: 'Invalid task type', code: 'BAD_REQUEST' } });
      return;
    }

    if (!reporterId || typeof reporterId !== 'string' || !reporterId.trim()) {
      res.status(400).json({
        error: {
          message: 'Reporter ID is Required',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const reporterMember = await prisma.projectMember.findFirst({
      where: {
        userId: reporterId,
        projectId,
        role: { in: ['ADMIN', 'MEMBER'] },
      },
    });

    if (!reporterMember) {
      res.status(400).json({
        error: {
          message: 'Reporter Must Be a Project "ADMIN" or "MEMBER"',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    if (type === 'STORY' && parentId) {
      res.status(400).json({
        error: {
          message: 'A "STORY" Cannot Have a Parent',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

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

    res.status(201).json(task);
  }
);

export default router;
