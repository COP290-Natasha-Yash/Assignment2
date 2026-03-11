import express, {Request, Response} from 'express';

import { prisma } from '../../prisma';

const router = express.Router();

router.post('/', async (req: Request, res: Response) => {

    const {name , description} = req.body;

    if (!name){
        res.status(400).json({error: {message: 'Invalid Name', code: 'BAD_REQUEST'}});
        return;
    }

    const project = await prisma.project.create({data :{name, description}});

    res.status(201).json(project);
});

export default router;