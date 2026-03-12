import express from 'express';

import addRouter from './add';
import removeRouter from './remove';
import updateRoleRouter from './updateRole';

const router = express.Router();

router.use(addRouter);
router.use(removeRouter);
router.use(updateRoleRouter);


export default router;