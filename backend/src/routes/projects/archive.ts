import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to project admins only
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles PATCH /:id/archive — archives or unarchives a project
router.patch(
  '/:id/archive',
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

      // Validating that a boolean value was provided in the request body
      const { bool } = req.body;
      if (typeof bool !== 'boolean') {
        res.status(400).json({
          error: {
            message: 'A Boolean Value is Required',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Preventing archiving a project that is already archived
      if (project.archived && bool) {
        res.status(400).json({
          error: {
            message: 'Project is Already Archived',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Preventing unarchiving a project that is already unarchived
      if (!project.archived && !bool) {
        res.status(400).json({
          error: {
            message: 'Project is Already Unarchived',
            code: 'BAD_REQUEST',
          },
        });
        return;
      }

      // Updating the archived status of the project
      const updated_project = await prisma.project.update({
        where: { id },
        data: { archived: bool },
      });

      res.status(200).json(updated_project);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Archive project error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
