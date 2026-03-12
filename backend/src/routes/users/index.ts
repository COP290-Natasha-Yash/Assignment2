import express from 'express';

import getAllRouter from './getAll';
import getOneRouter from './getOne';
import updateRouter from './update';
import updateRoleRouter from './updateRole';

const router = express.Router();

router.use(getAllRouter);
router.use(getOneRouter);
router.use(updateRouter);
router.use(updateRoleRouter);

export default router;