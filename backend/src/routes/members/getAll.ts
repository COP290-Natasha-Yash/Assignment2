import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins and members only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/members — retrieves all members of a project
router.get(
  '/:id/members',
  requireProjectRole(['ADMIN', 'MEMBER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Fetching all project members and including their basic user info
      const projectMembers = await prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      res.status(200).json(projectMembers);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get members error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
