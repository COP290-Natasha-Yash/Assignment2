import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.patch('/:notificationId', async (req: Request, res: Response) => {
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

  const updated_notification = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  res.status(200).json(updated_notification);
});

export default router;
