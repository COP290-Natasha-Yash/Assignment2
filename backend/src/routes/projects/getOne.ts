import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id — retrieves a single project by ID
router.get(
  '/:id',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const id = req.params.id as string;

      // Project existence is already guaranteed by requireProjectRole middleware
      const project = await prisma.project.findUnique({ where: { id } });

      res.status(200).json(project);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get project error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
