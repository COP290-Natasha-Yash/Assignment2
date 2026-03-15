import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/boards/:boardId/columns/:columnId/tasks/:taskId/activity',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
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

    const comments = await prisma.comment.findMany({ where: { taskId } });

    const auditLogs = await prisma.auditLog.findMany({ where: { taskId } });

    const combined = [
      ...comments.map((c) => ({ ...c, type: 'COMMENT' })),
      ...auditLogs.map((a) => ({ ...a, type: 'AUDIT' })),
    ].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    res.status(200).json(combined);
  }
);

export default router;
