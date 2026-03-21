import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';

const router = express.Router();

// Pulling JWT secrets from env variables, falling back to hardcoded defaults (dev only)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'supersecretrefresh';

// Handles POST /login — authenticates a user by email or username + password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    // Trimming inputs to avoid whitespace issues, and ensuring they're strings
    const cleanEmail = typeof email === 'string' ? email.trim() : undefined;
    const cleanUsername =
      typeof username === 'string' ? username.trim() : undefined;

    // Making sure at least one identifier (email or username) and a password are provided
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

    // Building the query dynamically based on whichever identifiers were provided
    let userQuery = {};

    if (cleanEmail && cleanUsername) {
      userQuery = { email: cleanEmail, username: cleanUsername };
    } else if (cleanEmail) {
      userQuery = { email: cleanEmail };
    } else {
      userQuery = { username: cleanUsername };
    }

    // Looking up the user in the database using the constructed query
    const user = await prisma.user.findFirst({
      where: userQuery,
    });

    // If no user was found, return a generic 401 to avoid leaking whether the account exists
    if (!user) {
      res.status(401).json({
        error: { message: 'Invalid Credentials', code: 'UNAUTHORIZED' },
      });
      return;
    }

    // Comparing the provided password against the stored bcrypt hash
    const valid = await bcrypt.compare(password, user.password);

    // Wrong password — same generic error to prevent from leaking whether the account exists
    if (!valid) {
      res.status(401).json({
        error: { message: 'Invalid Credentials', code: 'UNAUTHORIZED' },
      });
      return;
    }

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
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.globalRole,
      },
    });
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Login error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});

export default router;
