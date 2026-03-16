import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

router.post('/', requireGlobalAdmin, async (req: Request, res: Response) => {
  const { name, description } = req.body;

  if (!name?.trim()) {
    res
      .status(400)
      .json({ error: { message: 'Name is Required', code: 'BAD_REQUEST' } });
    return;
  }

  const project = await prisma.project.create({ data: { name, description } });

  res.status(201).json(project);
});

export default router;
