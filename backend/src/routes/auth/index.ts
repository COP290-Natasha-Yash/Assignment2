// Importing express to use its Router for organizing auth routes
import express from 'express';

// Importing individual route handlers for each auth operation
import loginRouter from './login';
import logoutRouter from './logout';
import refreshRouter from './refresh';
import registerRouter from './register';

// Creating a single router instance to combine all auth-related routes
const router = express.Router();

// Putting each auth route onto the main router
router.use(loginRouter);
router.use(logoutRouter);
router.use(refreshRouter);
router.use(registerRouter);

// Exporting the combined auth router to be used in the main app
export default router;
