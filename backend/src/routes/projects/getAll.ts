import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  const userId = req.userId!;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.globalRole === 'GLOBAL_ADMIN') {
    const projects = await prisma.project.findMany();
    res.status(200).json(projects);
    return;
  }

  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: { userId },
      },
    },
  });

  res.status(200).json(projects);
});

export default router;
