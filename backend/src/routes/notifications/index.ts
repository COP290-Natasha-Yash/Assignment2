import express from 'express';

import getAllRouter from './getAll';
import getOneRouter from './getOne';
import getReadRouter from './getRead';
import getUnreadRouter from './getUnread';

import markReadRouter from './markRead';

const router = express.Router();

router.use(getAllRouter);
router.use(getReadRouter);
router.use(getUnreadRouter);
router.use(getOneRouter); //We have to keep the getOne beneath the Read and Unread routers because,
//if we didn't when i write get api/notifications/read -> it assumes read is an id and throws 404 error
router.use(markReadRouter);

export default router;
