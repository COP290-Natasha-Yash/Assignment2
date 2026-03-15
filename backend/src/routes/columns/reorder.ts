import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/boards/:boardId/columns/reorder',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    const columns = req.body;
    if (!columns || !Array.isArray(columns)) {
      res.status(400).json({
        error: { message: 'Columns array is required', code: 'BAD_REQUEST' },
      });
      return;
    }

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

    for (let i = 0; i < columns.length; i++) {
      const { id, order } = columns[i];

      await prisma.column.update({ where: { id }, data: { order } });
    }

    res.status(200).json({ message: 'Columns reordered successfully' });
  }
);

export default router;
