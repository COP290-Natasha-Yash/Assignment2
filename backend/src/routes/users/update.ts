import express, { Request, Response } from 'express';

import { prisma } from '../../prisma';

// Importing multer upload middleware for handling file uploads
import { upload } from '../../utils/upload';

const router = express.Router();

// Handles PATCH /me — updates the current user's name and/or avatar
router.patch(
  '/me',
  // Handling single file upload for the avatar field
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      // Grabbing the userId attached by the authenticate middleware
      const userId = req.userId as string;

      // Looking up the user to make sure they exist
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          globalRole: true,
          avatar: true,
        },
      });

      // If no user found, return 404
      if (!user) {
        res
          .status(404)
          .json({ error: { message: 'User Not Found', code: 'NOT_FOUND' } });
        return;
      }

      const { name } = req.body;

      // If name is provided, making sure it's a non-empty string
      if (
        name !== undefined &&
        (typeof name !== 'string' || name.trim() === '')
      ) {
        res.status(400).json({
          error: { message: 'Name Cannot be Empty', code: 'BAD_REQUEST' },
        });
        return;
      }

      // Building the avatar path from the uploaded file if one was provided
      const avatar = req.file ? `/uploads/${req.file.filename}` : undefined;

      // Updating only the fields that were actually provided in the request
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(avatar !== undefined && { avatar }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          globalRole: true,
          avatar: true,
        },
      });

      res.status(200).json(updatedUser);
    } catch (error) {
      // Something unexpected went wrong — log it and return a generic 500
      console.error('Update me error:', error);
      res.status(500).json({
        error: { message: 'Internal Server Error', code: 'INTERNAL_ERROR' },
      });
    }
  }
);

export default router;
