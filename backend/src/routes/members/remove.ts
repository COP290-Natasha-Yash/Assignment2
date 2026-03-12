import express, {Request,Response } from 'express';

import {prisma} from '../../prisma';

const router = express.Router();

router.delete('/:id/members/:userId', async (req:Request, res: Response) => {

    const projectId = req.params.id as string;
    const project = await prisma.project.findUnique({where: {id: projectId}});
    if (!project){
        res.status(404).json({error: {message: 'Project Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const userId = req.params.userId as string;
    if (!userId){
        res.status(400).json({error: {message: 'UserId is Required', code: 'BAD_REQUEST'}});
        return;
    }

    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user){
        res.status(404).json({error: {message: 'User Not Found', code: 'NOT_FOUND'}});
        return;
    }

    
    await prisma.projectMember.delete({where: {id: userId}});


    res.status(201).json({message: 'User Was Successfully Removed'});

});


export default router;