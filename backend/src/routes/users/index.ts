import express from 'express';

import getAllRouter from './getAll';
import getMeRouter from './getMe';
import getOneRouter from './getOne';
import updateRouter from './update';

const router = express.Router();

router.use(getAllRouter);
router.use(getMeRouter);
router.use(getOneRouter);
router.use(updateRouter);

export default router;
