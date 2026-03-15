import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { authenticate } from '../../middleware/auth';

const router = express.Router();

router.post('/logout', authenticate, async (req: Request, res: Response) => {
  const userId = req.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    res.status(404).json({
      error: { message: 'User Not Found', code: 'NOT_FOUND' },
    });
    return;
  }

  if (!user.refreshToken) {
    res.status(400).json({
      error: {
        message: 'User is Already Logged Out',
        code: 'ALREADY_LOGGED_OUT',
      },
    });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });

  res.clearCookie('token');
  res.clearCookie('refreshToken');

  res.status(200).json({ message: 'Logged Out Successfully' });
});

export default router;
