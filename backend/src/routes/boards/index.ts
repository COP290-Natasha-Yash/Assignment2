import express from 'express';

// Importing individual route handlers for each board operation
import createRouter from './create';
import deleteRouter from './delete';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import updateRouter from './update';

// Creating a single router instance to combine all board-related routes
const router = express.Router();

// Mounting each board route onto the main router
router.use(createRouter);
router.use(deleteRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(updateRouter);

// Exporting the combined board router to be used in the main app
export default router;
