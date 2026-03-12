import express, {Request, Response } from 'express';

import {prisma } from '../../prisma';

import {requireProjectRole}  from '../../middleware/roles';


const router = express.Router();

router.delete('/:id/boards/:boardId', requireProjectRole(['ADMIN']), async (req: Request, res: Response) => {

    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({where: {id :projectId}});
    if (!project ){
        res.status(404).json({error: {message: 'Project Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({where: {id: boardId}});
    if (!board){
        res.status(404).json({error: {message: 'Board Not Found', code: 'NOT_FOUND'}});
        return;
    }

    await prisma.board.delete({where: {id: boardId}});

    
    res.status(200).json({message: 'Board Deleted Successfully'});
});


export default router;