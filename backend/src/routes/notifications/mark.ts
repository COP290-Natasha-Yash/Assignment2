import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles PATCH /:notificationId — marks a notification as read or unread
router.patch('/:notificationId', async (req: Request, res: Response) => {
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

    // Validating that a boolean value was provided in the request body
    const { bool } = req.body;
    if (typeof bool !== 'boolean') {
      res.status(400).json({
        error: { message: 'A Boolean Value is Required', code: 'BAD_REQUEST' },
      });
      return;
    }

    // Updating the read status of the notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: bool },
    });

    res.status(200).json(updatedNotification);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Update notification error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
