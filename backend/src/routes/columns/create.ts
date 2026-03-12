import express, {Request, Response} from 'express'

import { prisma } from '../../prisma';

const router = express.Router();

router.post('/:id/boards/:boardId/columns', async (req: Request, res: Response) => {

    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({where : {id: projectId}});
    if (!project){
        res.status(404).json({error: {message: 'Project not found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;
    const board = await prisma.board.findUnique({where: {id: boardId}});
    if (!board){
        res.status(404).json({error: {message: 'Board Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const {name,order, wipLimit} = req.body;

    if (!name){
            res.status(400).json({error: {message: 'Name is Required', code: 'BAD_REQUEST'}});
            return;
        }

    if (!order){
        res.status(400).json({error: {message: 'Order is Required', code: 'BAD_REQUEST'}});
        return;
    }

    if (typeof order !=='number'){
        res.status(400).json({error: {message: 'Invalid Order', code: 'BAD_REQUEST'}});
        return;
    }

    
    const column = await prisma.column.create({data : {name,order, wipLimit, boardId}});

    
    res.status(201).json(column);

});

export default router;