import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles GET / — retrieves all projects the current user has access to
router.get('/', async (req: Request, res: Response) => {
  try {
    // Grabbing the userId attached by the authenticate middleware
    const userId = req.userId!;

    // Looking up the user to check their global role
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Global admins can see all projects regardless of membership
    if (user?.globalRole === 'GLOBAL_ADMIN') {
      const projects = await prisma.project.findMany();
      res.status(200).json(projects);
      return;
    }

    // Regular users can only see projects they are a member of
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
    });

    res.status(200).json(projects);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Get projects error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
