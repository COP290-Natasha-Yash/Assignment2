import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

import { upload } from '../../utils/upload';

const router = express.Router();

router.patch(
  '/me',
  upload.single('avatar'),
  async (req: Request, res: Response) => {
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

    const { name } = req.body;
    if (name !== undefined && name.trim() === '') {
      res.status(400).json({
        error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
      });
      return;
    }

    const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatar !== undefined && { avatar }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        globalRole: true,
        avatar: true,
      },
    });

    res.status(200).json(updatedUser);
  }
);

export default router;
