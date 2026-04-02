import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles GET /:notificationId — retrieves a single notification for the current user
router.get('/:notificationId', async (req: Request, res: Response) => {
  try {
    // Grabbing the notification ID from the route params
    const notificationId = req.params.notificationId as string;

    // Looking up the notification to make sure it exists
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      res.status(404).json({
        error: { message: 'Notification Not Found', code: 'NOT_FOUND' },
      });
      return;
    }

    // Grabbing the userId from the authenticate middleware
    const userId = req.userId;

    // Making sure the notification belongs to the current user
    if (notification.userId !== userId) {
      res.status(403).json({
        error: {
          message: 'You Can Only Manage Your Own Notifications',
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    res.status(200).json(notification);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Get notification error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
