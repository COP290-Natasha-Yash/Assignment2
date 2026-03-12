import express, {Request, Response} from 'express';

import {prisma } from '../../prisma';

const router = express.Router();

router.get('/:taskId/comments/:commentId', async (req:Request, res: Response) => {

    const taskId = req.params.taskId as string ;
    const task = await prisma.task.findUnique({where: {id: taskId}});
    if (!task){
        res.status(404).json({error: {message: 'Task NOT Found', code: 'NOT_FOUND'}});
        return;
    }

    const commentId = req.params.commentId as string ;
    const comment = await prisma.comment.findUnique({where : {id: commentId}});
    if (!comment){
        res.status(404).json({error: {message: 'Comment NOT Found', code: 'NOT_FOUND'}});
        return;
    }

    res.status(200).json (comment);

});

export default router;