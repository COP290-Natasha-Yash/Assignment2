import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.get('/unread', async (req: Request, res: Response) => {
  const userId = req.userId;

  const notifications = await prisma.notification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json(notifications);
});

export default router;
