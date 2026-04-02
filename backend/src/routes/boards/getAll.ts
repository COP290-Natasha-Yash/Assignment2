import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing role-based middleware to restrict this route to all project members
import { requireProjectRole } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:id/boards — retrieves all boards for a given project
router.get(
  '/:id/boards',
  requireProjectRole(['ADMIN', 'MEMBER', 'VIEWER']),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Fetching all boards that belong to this project
      const boards = await prisma.board.findMany({ where: { projectId } });

      res.status(200).json(boards);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('GetAll board error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
