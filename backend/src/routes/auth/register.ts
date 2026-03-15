import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password, username } = req.body;

  if (!name || !email || !password || !username) {
    res
      .status(400)
      .json({
        error: { message: 'All Fields are Required.', code: 'BAD_REQUEST' },
      });
    return;
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    res
      .status(400)
      .json({
        error: { message: 'Email Already in Use.', code: 'EMAIL_TAKEN' },
      });
    return;
  }
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    res
      .status(400)
      .json({
        error: { message: 'Username Already Taken', code: 'USERNAME_TAKEN' },
      });
    return;
  }

  const hashpass = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { name, password: hashpass, email, username },
  });

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '15m' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false,
    maxAge: 15 * 60 * 1000,
  });

  const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
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

  res
    .status(201)
    .json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
      },
    });
});

export default router;
