import { Request, Response, NextFunction } from 'express';

import jwt from 'jsonwebtoken';

// Pulling the JWT secret from env, falling back to a hardcoded default for dev
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Extending Express's Request type globally so we can attach userId to any request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Middleware that protects routes by verifying the JWT token from cookies
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Grabbing the token from the httpOnly cookie set during login
  const token = req.cookies.token;

  // If there's no token at all, reject the request immediately
  if (!token) {
    res
      .status(401)
      .json({ error: { message: 'Token is Required', code: 'UNAUTHORIZED' } });
    return;
  }

  try {
    // Verifying the token signature and expiry, then extracting the userId payload
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Runtime check to ensure the token actually contains a userId field
    if (!decoded.userId) {
      res
        .status(401)
        .json({ error: { message: 'Invalid Token', code: 'UNAUTHORIZED' } });
      return;
    }

    // Attaching the userId to the request so downstream route handlers can use it
    req.userId = decoded.userId;
    next();
  } catch (err) {
    // Distinguishing between an expired token and a completely invalid one
    if (err instanceof jwt.TokenExpiredError) {
      res
        .status(401)
        .json({ error: { message: 'Token Expired', code: 'TOKEN_EXPIRED' } });
    } else {
      res
        .status(401)
        .json({ error: { message: 'Invalid Token', code: 'UNAUTHORIZED' } });
    }
    return;
  }
};
