import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/archive',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res
        .status(404)
        .json({ error: { message: 'Project Not Found', code: 'NOT_FOUND' } });
      return;
    }

    if (project.archived) {
      res.status(400).json({
        error: {
          message: 'Project is already archived',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const updated_project = await prisma.project.update({
      where: { id },
      data: { archived: true },
    });

    res.status(200).json(updated_project);
  }
);

export default router;
