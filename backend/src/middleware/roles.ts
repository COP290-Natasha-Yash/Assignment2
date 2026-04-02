import { Request, Response, NextFunction } from 'express';

import { prisma } from '../prisma';

// Middleware that restricts a route to only global admins
export const requireGlobalAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;

    // Looking up the user by the userId attached by the authenticate middleware
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // If user doesn't exist, they shouldn't be here
    if (!user) {
      res
        .status(401)
        .json({ error: { message: 'Login Required', code: 'UNAUTHORIZED' } });
      return;
    }

    // Checking if the user has the GLOBAL_ADMIN role, blocking everyone else
    if (user.globalRole !== 'GLOBAL_ADMIN') {
      res.status(403).json({
        error: { message: 'Global Admin Access Required', code: 'FORBIDDEN' },
      });
      return;
    } else {
      next();
    }
  } catch (error) {
    // Something unexpected went wrong — log it and return a generic 500
    console.error('requireGlobalAdmin error:', error);
    res.status(500).json({
      error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
    });
  }
};

// Middleware factory that restricts a route to users with one of the specified project roles
export const requireProjectRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Grabbing the project ID from the route params
      const projectId = req.params.id as string;

      // Checking the user first before doing the project lookup
      const user = await prisma.user.findUnique({ where: { id: req.userId } });

      // Making sure the project actually exists before checking membership
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        res.status(404).json({
          error: { message: 'Project Not Found', code: 'NOT_FOUND' },
        });
        return;
      }

      // Global admins bypass project role checks entirely
      if (user?.globalRole === 'GLOBAL_ADMIN') {
        next();
        return;
      }

      // Checking if the user is actually a member of this project
      const member = await prisma.projectMember.findFirst({
        where: { userId: req.userId, projectId },
      });

      if (!member) {
        res.status(403).json({
          error: {
            message: 'You Are Not a Member of This Project',
            code: 'FORBIDDEN',
          },
        });
        return;
      }

      // Checking if the member's role is in the list of roles allowed for this route
      if (!allowedRoles.includes(member.role)) {
        res.status(403).json({
          error: {
            message: 'You Do Not Have Permission to Do This',
            code: 'FORBIDDEN',
          },
        });
        return;
      } else {
        next();
      }
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('requireProjectRole error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  };
};
