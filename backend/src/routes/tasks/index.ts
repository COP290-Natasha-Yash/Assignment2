import express from 'express';

// Importing individual route handlers for each task operation
import createRouter from './create';
import deleteRouter from './delete';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import moveRouter from './move';
import updateRouter from './update';
import activityRouter from './activity';

// Creating a single router instance to combine all task-related routes
const router = express.Router();

// Mounting each task route onto the main router
router.use(createRouter);
router.use(deleteRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(moveRouter);
router.use(updateRouter);
router.use(activityRouter);

// Exporting the combined task router to be used in the main app
export default router;
