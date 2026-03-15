import express from 'express';

import loginRouter from './login';
import logoutRouter from './logout';
import refreshRouter from './refresh';
import registerRouter from './register';

const router = express.Router();

router.use(loginRouter);
router.use(logoutRouter);
router.use(refreshRouter);
router.use(registerRouter);

export default router;
