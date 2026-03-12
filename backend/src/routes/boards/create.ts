import express, {Request, Response} from 'express'

import { prisma } from '../../prisma';

const router = express.Router();

router.post('/:id/boards', async (req: Request, res: Response) => {

    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({where : {id: projectId}});
    if (!project){
        res.status(404).json({error: {message: 'Project Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const name = req.body.name;
    if (!name){
        res.status(400).json({error: {message: 'Name is Required', code: 'BAD_REQUEST'}});
        return;
    }

    const board = await prisma.board.create({data: {name,projectId}});

    
    res.status(201).json(board);

});

export default router;