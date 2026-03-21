import express from 'express';

// Importing individual route handlers for each member operation
import addRouter from './add';
import removeRouter from './remove';
import updateRoleRouter from './updateRole';
import getMembersRouter from './getAll';

// Creating a single router instance to combine all member-related routes
const router = express.Router();

// Mounting each member route onto the main router
router.use(addRouter);
router.use(removeRouter);
router.use(updateRoleRouter);
router.use(getMembersRouter);

// Exporting the combined member router to be used in the main app
export default router;
