import express, { Request, Response } from 'express';

import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

// Pulling JWT secrets from env variables, falling back to hardcoded defaults (dev only)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';

// Handles POST /refresh — issues a new access token using a valid refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Grabbing the refresh token from the httpOnly cookie
    const refreshToken = req.cookies.refreshToken;

    // If there's no refresh token, reject the request
    if (!refreshToken) {
      res.status(400).json({
        error: { message: 'Refresh Token Required', code: 'BAD_REQUEST' },
      });
      return;
    }

    // Verifying the refresh token signature and expiry
    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      res.status(401).json({
        error: { message: 'Invalid Refresh Token', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // Looking up the user by refresh token to make sure it hasn't been invalidated
    const user = await prisma.user.findUnique({ where: { refreshToken } });
    if (!user) {
      res.status(401).json({
        error: { message: 'Invalid Refresh Token', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // Signing a new short-lived access token and setting it as an httpOnly cookie
    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '15m',
    });
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
    });

    res.status(200).json({ message: 'Token Refreshed Successfully' });
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
