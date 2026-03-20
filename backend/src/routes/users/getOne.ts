import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';
import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

router.get(
  '/:userId',
  requireGlobalAdmin,
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string;

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

    res.status(200).json(user);
  }
);

export default router;
