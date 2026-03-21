import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing the auth middleware to protect this route — only logged-in users can log out
import { authenticate } from '../../middleware/auth';

const router = express.Router();

// Handles POST /logout — clears the user's tokens and cookies to end their session
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // Getting the userId that was attached to the request by the authenticate middleware
    const userId = req.userId;

    // Looking up the user in the DB to make sure they actually exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // If no user found, return 404
    if (!user) {
      res.status(404).json({
        error: { message: 'User Not Found', code: 'NOT_FOUND' },
      });
      return;
    }

    // If there's no refresh token, the user is already logged out — no need to proceed
    if (!user.refreshToken) {
      res.status(400).json({
        error: {
          message: 'User is Already Logged Out',
          code: 'ALREADY_LOGGED_OUT',
        },
      });
      return;
    }

    // Clearing the refresh token from the DB to invalidate the session server-side
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    // Clearing both auth cookies from the client side — options must match how they were set
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    res.status(200).json({ message: 'Logged Out Successfully' });
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Logout error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
