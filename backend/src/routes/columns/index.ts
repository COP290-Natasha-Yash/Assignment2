import express from 'express';

// Importing individual route handlers for each column operation
import createRouter from './create';
import deleteRouter from './delete';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import reorderRouter from './reorder';
import updateRouter from './update';

// Creating a single router instance to combine all column-related routes
const router = express.Router();

// Mounting each column route onto the main router
router.use(createRouter);
router.use(deleteRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(reorderRouter);
router.use(updateRouter);

// Exporting the combined column router to be used in the main app
export default router;
