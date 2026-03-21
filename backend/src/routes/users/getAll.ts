import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';
// Importing global admin middleware to restrict this route to global admins only
import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

// Handles GET / — retrieves all users, restricted to global admins only
router.get('/', requireGlobalAdmin, async (req: Request, res: Response) => {
  try {
    // Fetching all users but only selecting safe fields — no passwords or refresh tokens
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        avatar: true,
      },
    });

    res.status(200).json(users);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Get all users error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
