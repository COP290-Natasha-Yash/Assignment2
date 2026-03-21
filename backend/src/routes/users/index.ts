import express from 'express';

// Importing individual route handlers for each user operation
import getAllRouter from './getAll';
import getMeRouter from './getMe';
import getOneRouter from './getOne';
import updateRouter from './update';

// Creating a single router instance to combine all user-related routes
const router = express.Router();

// Mounting each user route onto the main router
router.use(getAllRouter);
router.use(getMeRouter); // Note: getMeRouter must stay above getOneRouter so GET /me is not treated as a userId param
router.use(getOneRouter);
router.use(updateRouter);

// Exporting the combined user router to be used in the main app
export default router;
