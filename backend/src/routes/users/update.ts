import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.patch('/me', async (req: Request, res: Response) => {
  const userId = req.userId as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      globalRole: true,
      avatar: true,
    },
  });
  if (!user) {
    res
      .status(404)
      .json({ error: { message: 'User Not Found', code: 'NOT_FOUND' } });
    return;
  }

  const { name, avatar } = req.body;

  if (name !== undefined && name.trim() === '') {
    res
      .status(400)
      .json({
        error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
      });
    return;
  }

  const updated_user = await prisma.user.update({
    where: { id: userId },
    data: { name, avatar },
    select: {
      id: true,
      name: true,
      email: true,
      globalRole: true,
      avatar: true,
    },
  });

  res.status(200).json(updated_user);
});

export default router;
