import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing global admin middleware to restrict project creation to global admins only
import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

// Handles POST / — creates a new project
router.post('/', requireGlobalAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    // Validating that a non-empty project name was provided
    if (!name || typeof name !== 'string' || !name.trim()) {
      res
        .status(400)
        .json({ error: { message: 'Name is Required', code: 'BAD_REQUEST' } });
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

    // Creating the project in the DB with the trimmed name and optional description
    const project = await prisma.project.create({
      data: { name: name.trim(), description },
    });

    res.status(201).json(project);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Create project error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
