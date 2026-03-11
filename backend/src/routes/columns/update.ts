import express, {Request, Response} from 'express';

import { prisma } from '../../prisma';

const router = express.Router();


router.patch('/:id/boards/:boardId/columns/:columnId', async (req: Request, res: Response) => {

    const projectId = req.params.id as string ;

    const project = await prisma.project.findUnique({where: {id: projectId}});

    if (!project){
        res.status(404).json({error: {message: 'Project Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({where : {id: boardId}});

    if (!board){
        res.status(404).json({error: {message: 'Board Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const columnId = req.params.columnId as string;

    const column = await prisma.column.findUnique({where: {id: columnId}});

    if (!column){
        res.status(404).json({error: {message: 'Column Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const {name,order,wipLimit} = req.body;

    if (!name){
        res.status(400).json({error: {message: 'Name is required', code: 'BAD_REQUEST'}});
        return;
        }

    if (!order){
        res.status(400).json({error: {message: 'Order is required', code: 'BAD_REQUEST'}});
        return;
    }

    if (typeof order !== 'number'){
        res.status(400).json({error: {message: 'Invalid Order', code: 'BAD_REQUEST'}});
        return;
    }

    const updated_column = await prisma.column.update({where: {id: columnId}, data: {name,order,wipLimit}});

    res.status(200).json(updated_column);


});

export default router;