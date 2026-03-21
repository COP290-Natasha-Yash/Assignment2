import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles GET / — retrieves all notifications for the current user sorted by newest first
router.get('/', async (req: Request, res: Response) => {
  try {
    // Grabbing the userId attached by the authenticate middleware
    const userId = req.userId;

    // Fetching all notifications for this user ordered by most recent first
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(notifications);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
