import express, {Request, Response } from 'express';

import {prisma } from '../../prisma';

const router = express.Router();

router.get('/:id/boards/:boardId', async (req: Request, res: Response) => {

    const projectId = req.params.id as string;

    const project = await prisma.project.findUnique({where: {id :projectId}});

    if (!project ){
        res.status(404).json({error: {message: 'Project not found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({where: {id: boardId}});

    if (!board){
        res.status(404).json({error: {message: 'Board not found', code: 'NOT_FOUND'}});
        return;
    }

    res.status(200).json(board);
});


export default router;