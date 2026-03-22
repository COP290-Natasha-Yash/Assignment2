import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

// Pulling JWT secrets from env variables, falling back to hardcoded defaults (dev only)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';

// Handles POST /register — creates a new user account and logs them in
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, username } = req.body;

    // Making sure password is a string before doing any checks on it
    if (typeof password !== 'string') {
      res.status(400).json({
        error: { message: 'Invalid Password Format', code: 'BAD_REQUEST' },
      });
      return;
    }

    // Making sure all required fields are provided and non-empty
    if (
      !name?.trim() ||
      !email?.trim() ||
      !password?.trim() ||
      !username?.trim()
    ) {
      res.status(400).json({
        error: { message: 'All Fields are Required.', code: 'BAD_REQUEST' },
      });
      return;
    }

    // Email should contain @
    if (!email.trim().includes('@')) {
      res.status(400).json({
        error: { message: 'Invalid Email Format', code: 'BAD_REQUEST' },
      });
      return;
    }

    // Checking if the email is already in use
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.trim() },
    });
    if (existingEmail) {
      res.status(400).json({
        error: { message: 'Email Already in Use.', code: 'EMAIL_TAKEN' },
      });
      return;
    }

    // Username should not contain spaces or @
    if (username.trim().includes(' ') || username.trim().includes('@')) {
      res.status(400).json({
        error: {
          message: 'Username Cannot Contain Spaces or @',
          code: 'BAD_REQUEST',
        },
      });
      return;
    }
    // Checking if the username is already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existingUsername) {
      res.status(400).json({
        error: { message: 'Username Already Taken', code: 'USERNAME_TAKEN' },
      });
      return;
    }

    // Hashing the password before storing it in the DB
    const hashpass = await bcrypt.hash(password, 10);

    // Creating the new user in the DB with trimmed values
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        password: hashpass,
        email: email.trim(),
        username: username.trim(),
      },
    });

    // Signing a short-lived access token (15 mins) and setting it as an httpOnly cookie
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '15m',
    });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    // Signing a longer-lived refresh token (1 day) and setting it as a separate httpOnly cookie
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, {
      expiresIn: '1d',
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Storing the refresh token in the DB so we can validate/invalidate it later
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: refreshToken },
    });

    // Returning safe user info — no password or tokens in the response body
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        globalRole: user.globalRole,
      },
    });
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Register error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
