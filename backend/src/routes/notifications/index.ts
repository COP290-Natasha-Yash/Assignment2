import express from 'express';

// Importing individual route handlers for each notification operation
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import markRouter from './mark';

// Creating a single router instance to combine all notification-related routes
const router = express.Router();

// Mounting each notification route onto the main router
router.use(getAllRouter);
router.use(getOneRouter);
router.use(markRouter);

// Exporting the combined notification router to be used in the main app
export default router;
