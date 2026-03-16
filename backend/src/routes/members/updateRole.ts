import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

router.patch(
  '/:id/members/:userId',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    const role = req.body.role;

    const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];

    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        error: {
          message: 'Role must be ADMIN, MEMBER or VIEWER',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }

    const userId = req.params.userId as string;
    if (!userId) {
      res.status(400).json({
        error: { message: 'UserId is Required', code: 'BAD_REQUEST' },
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

    const member = await prisma.projectMember.findFirst({
      where: { userId, projectId },
    });
    if (!member) {
      res.status(404).json({
        error: {
          message: 'User is NOT a Member in This Project',
          code: 'NOT_FOUND',
        },
      });
      return;
    }

    const updated_member = await prisma.projectMember.update({
      where: { id: member.id },
      data: { role },
    });

    res.status(200).json(updated_member);
  }
);

export default router;
