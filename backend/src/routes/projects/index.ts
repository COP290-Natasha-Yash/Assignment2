import express from 'express';

// Importing individual route handlers for each project operation
import archiveRouter from './archive';
import createRouter from './create';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import updateRouter from './update';

// Creating a single router instance to combine all project-related routes
const router = express.Router();

// Mounting each project route onto the main router
router.use(archiveRouter);
router.use(createRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(updateRouter);

// Exporting the combined project router to be used in the main app
export default router;
