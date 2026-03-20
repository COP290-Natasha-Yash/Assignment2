import express from 'express';

import addRouter from './add';
import removeRouter from './remove';
import updateRoleRouter from './updateRole';
import getMembersRouter from './getAll';

const router = express.Router();

router.use(addRouter);
router.use(removeRouter);
router.use(updateRoleRouter);
router.use(getMembersRouter);

export default router;
