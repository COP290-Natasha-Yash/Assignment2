import express from 'express';

import getAllRouter from './getAll';
import markReadRouter from './markRead';

const router = express.Router();

router.use(getAllRouter);
router.use(markReadRouter);

export default router;