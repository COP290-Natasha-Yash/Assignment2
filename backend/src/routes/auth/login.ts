import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';

router.post('/login', async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  const cleanEmail = typeof email === 'string' ? email.trim() : undefined;
  const cleanUsername =
    typeof username === 'string' ? username.trim() : undefined;

  // 1. Validation
  if (
    (!cleanEmail && !cleanUsername) ||
    typeof password !== 'string' ||
    !password.trim()
  ) {
    res.status(400).json({
      error: {
        message: 'Email/Username and Password are required',
        code: 'BAD_REQUEST',
      },
    });
    return;
  }

  let userQuery = {};

  if (cleanEmail && cleanUsername) {
    userQuery = { email: cleanEmail, username: cleanUsername };
  } else if (cleanEmail) {
    userQuery = { email: cleanEmail };
  } else {
    userQuery = { username: cleanUsername };
  }

  const user = await prisma.user.findFirst({
    where: userQuery,
  });

  if (!user) {
    res.status(401).json({
      error: { message: 'Invalid Credentials', code: 'UNAUTHORIZED' },
    });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    res.status(401).json({
      error: { message: 'Invalid Credentials', code: 'UNAUTHORIZED' },
    });
    return;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    maxAge: 15 * 60 * 1000,
  });

  const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
    expiresIn: '1d',
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: refreshToken },
  });

  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.globalRole,
    },
  });
});

export default router;
