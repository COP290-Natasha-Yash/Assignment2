import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

// Handles GET /me/tasks — returns all tasks assigned to the currently logged-in user across all projects
router.get('/me/tasks', async (req: Request, res: Response) => {
  try {
    // Grabbing the userId attached by the authenticate middleware
    const userId = req.userId as string;

    // Finding all tasks where this user is the assignee, regardless of project
    const tasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
      },
      // Including project info so the frontend knows which project each task belongs to
      include: {
        column: {
          include: {
            board: {
              include: { project: { select: { id: true, name: true } } },
            },
          },
        },
      },
      // Newest tasks first
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json(tasks);
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('Fetch user tasks error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
});
