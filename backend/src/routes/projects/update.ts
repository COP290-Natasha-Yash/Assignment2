import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id — updates a project's name and/or description
router.patch(
  '/:id',
  requireProjectRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const id = req.params.id as string;

      // Looking up the project to make sure it exists
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) {
        res
          .status(404)
          .json({ error: { message: 'Project Not Found', code: 'NOT_FOUND' } });
        return;
      }

      const { name, description } = req.body;

      // If name is provided, making sure it's a non-empty string
      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        res.status(400).json({
          error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
        });
        return;
      }

      // If description is provided, making sure it's a valid string
      if (description && typeof description !== 'string') {
        res.status(400).json({
          error: {
            message: 'Valid Description is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Updating only the fields that were actually provided in the request
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description }),
        },
      });

      res.status(200).json(updatedProject);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update project error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
