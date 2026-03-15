import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.post(
  '/:id/boards/:boardId/columns/:columnId/tasks',
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

    if (!title) {
      res
        .status(400)
        .json({ error: { message: 'Title is Required', code: 'BAD_REQUEST' } });
      return;
    }

    if (!reporterId) {
      res
        .status(400)
        .json({
          error: { message: 'Reporter ID is required', code: 'BAD_REQUEST' },
        });
      return;
    }

    if (type === 'STORY' && parentId) {
      res
        .status(400)
        .json({
          error: {
            message: 'A "STORY" Cannon Have a Parent',
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
              message: 'Parent task must be a Story',
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

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority,
        type,
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
