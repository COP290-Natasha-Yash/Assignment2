import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';
import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

router.get('/', requireGlobalAdmin, async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      globalRole: true,
      avatar: true,
    },
  });

  res.status(200).json(users);
});

export default router;
