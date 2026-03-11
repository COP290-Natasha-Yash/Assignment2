import express from 'express';

import createRouter from './create';
import getAllRouter from './getAll';
import getOneRouter from './getOne';
import updateRouter from './update';

const router = express.Router();

router.use(createRouter);
router.use(getAllRouter);
router.use(getOneRouter);
router.use(updateRouter);

export default router;