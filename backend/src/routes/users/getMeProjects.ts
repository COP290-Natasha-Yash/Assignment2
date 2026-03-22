import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles GET /me — retrieves the currently logged in user's projects
router.get('/me/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    // Finding all projects where this user is a member
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(200).json(memberships.map(m => m.project));
  } catch (error) {
    console.error('Fetch user projects error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' }
    });
  }
});

export default router;
