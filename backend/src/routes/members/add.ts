import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles POST /:id/members — adds a new member to a project
router.post(
  '/:id/members',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { email, username, role } = req.body;

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

      // Making sure at least one identifier (email or username) was provided
      if (!email && !username) {
        res.status(400).json({
          error: {
            message: 'Email or Username is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Looking up the user by email or username
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: email ?? undefined },
            { username: username ?? undefined },
          ],
        },
      });
      if (!user) {
        res
          .status(404)
          .json({ error: { message: 'User Not Found', code: 'NOT_FOUND' } });
        return;
      }

      const userId = user.id;

      // Checking if the user is already a member of this project
      const existing = await prisma.projectMember.findFirst({
        where: { userId, projectId },
      });
      if (existing) {
        res.status(400).json({
          error: { message: 'User is Already a Member', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Adding the user as a member of the project with the specified role
      const projectMember = await prisma.projectMember.create({
        data: { userId, projectId, role },
      });

      res.status(201).json(projectMember);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Add member error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
