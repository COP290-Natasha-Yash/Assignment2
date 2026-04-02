import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/members/:userId — updates a member's role in a project
router.patch(
  '/:id/members/:userId',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const role = req.body.role;

      // Defining the valid project roles
      const validRoles = ['ADMIN', 'MEMBER', 'VIEWER'];

      // Validating that a valid role was provided
      if (!role || !validRoles.includes(role)) {
        res.status(400).json({
          error: {
            message: 'Role must be ADMIN, MEMBER or VIEWER',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Grabbing the userId from the route params
      const userId = req.params.userId as string;

      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

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

      // Updating the member's role in the project
      const updatedMember = await prisma.projectMember.update({
        where: { id: member.id },
        data: { role },
      });

      res.status(200).json(updatedMember);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update member role error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
