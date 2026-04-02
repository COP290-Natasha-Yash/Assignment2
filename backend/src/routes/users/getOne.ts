import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';
// Importing global admin middleware to restrict this route to global admins only
import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

// Handles GET /:userId — retrieves a single user by ID, restricted to global admins only
router.get(
  '/:userId',
  requireGlobalAdmin,
  async (req: Request, res: Response) => {
    try {
      // Grabbing the userId from the route params
      const userId = req.params.userId as string;

      // Fetching the user but only selecting safe fields — no password or refresh token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          globalRole: true,
          avatar: true,
        },
      });

      // If no user found, return 404
      if (!user) {
        res
          .status(404)
          .json({ error: { message: 'User Not Found', code: 'NOT_FOUND' } });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Get user error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
