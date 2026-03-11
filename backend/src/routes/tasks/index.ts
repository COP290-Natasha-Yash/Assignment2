import express from 'express';

import createRouter from './create';
import deleteRouter from './delete';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import moveRouter from './move';
import updateRouter from './update';

const router = express.Router();

router.use(createRouter);
router.use(deleteRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(moveRouter);
router.use(updateRouter);

export default router;