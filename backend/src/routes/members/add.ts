import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.post(
  '/:id/members',
  requireProjectRole(['ADMIN']),
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

    const { userId, role } = req.body;

    if (!userId) {
      res
        .status(400)
        .json({
          error: { message: 'UserId is Required', code: 'BAD_REQUEST' },
        });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res
        .status(404)
        .json({ error: { message: 'User Not Found', code: 'NOT_FOUND' } });
      return;
    }

    const existing = await prisma.projectMember.findFirst({
      where: { userId, projectId },
    });
    if (existing) {
      res
        .status(400)
        .json({
          error: { message: 'User is Already a Member', code: 'BAD_REQUEST' },
        });
      return;
    }

    const projectMember = await prisma.projectMember.create({
      data: { userId, projectId, role },
    });

    res.status(201).json(projectMember);
  }
);

export default router;
