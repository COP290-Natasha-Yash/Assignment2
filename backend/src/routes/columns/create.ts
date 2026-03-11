import express, {Request, Response} from 'express'

import { prisma } from '../../prisma';

const router = express.Router();

router.post('/:id/boards/:boardId/columns', async (req: Request, res: Response) => {

    const {name,order, wipLimit} = req.body;

    if (!name || !order){
        res.status(400).json({error: {message: 'Invalid name or order', code: 'BAD_REQUEST'}});
        return;
    }

    const projectId = req.params.id as string;

    const project = await prisma.project.findUnique({where : {id: projectId}});

    if (!project){
        res.status(404).json({error: {message: 'Project not found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({where: {id: boardId}});

    if (!board){
        res.status(404).json({error: {message: 'Board not found', code: 'NOT_FOUND'}});
        return;
    }

    const column = await prisma.column.create({data : {name,order, wipLimit, boardId}});

    res.status(201).json(column);

});

export default router;