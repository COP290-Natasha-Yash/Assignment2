import express, {Request, Response} from 'express';

import { prisma } from '../../prisma';

const router = express.Router();


router.patch('/:id', async (req: Request, res: Response) => {

    const id = req.params.id as string ;

    const {name, description} = req.body;

    const project = await prisma.project.findUnique({where: {id}});

    if (!project){
        res.status(404).json({error: {message: 'Project not found', code: 'NOT_FOUND'}});
        return;
    }

    const updated_project = await prisma.project.update({where: {id}, data: {name, description}});

    res.status(200).json(updated_project);


});

export default router;