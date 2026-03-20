import express, { Request, Response } from 'express';

import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';

router.post('/refresh', async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(400).json({
      error: { message: 'Refresh Token Required', code: 'BAD_REQUEST' },
    });
    return;
  }

  try {
    jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch {
    res.status(401).json({
      error: { message: 'Invalid Refresh Token', code: 'UNAUTHORIZED' },
    });
    return;
  }
  const user = await prisma.user.findUnique({ where: { refreshToken } });

  if (!user) {
    res.status(401).json({
      error: { message: 'Invalid Refresh Token', code: 'UNAUTHORIZED' },
    });
    return;
  }

  const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
    expiresIn: '15m',
  });
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: false,
    maxAge: 15 * 60 * 1000,
  });

  res.status(200).json({ message: 'Token Refreshed Successfully' });
});

export default router;
