import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:id/members',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    const userId = req.userId;

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

    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    res.status(200).json(projectMembers);
  }
);

export default router;
