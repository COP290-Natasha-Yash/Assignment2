import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles DELETE /:id/members/:userId — removes a member from a project
router.delete(
  '/:id/members/:userId',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Grabbing the userId from the route params
      const userId = req.params.userId as string;

      // Checking if the user is actually a member of this project
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

      // Removing the member from the project
      await prisma.projectMember.delete({ where: { id: member.id } });

      res.status(200).json({ message: 'User Was Successfully Removed' });
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Remove member error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
