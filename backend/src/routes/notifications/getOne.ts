import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.get('/:notificationId', async (req: Request, res: Response) => {
  const notificationId = req.params.notificationId as string;
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) {
    res.status(404).json({
      error: { message: 'Notification Not Found', code: 'NOT_FOUND' },
    });
    return;
  }

  const userId = req.userId;
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
});

export default router;
