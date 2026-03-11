import express, {Request, Response} from 'express';

import { prisma } from '../prisma';

const router = express.Router();


router.post('/', async (req: Request, res: Response) => {

    const {name, description} = req.body;

    if (!name){
        res.status(400).json({error: {message: 'Invalid Name', code: 'BAD_REQUEST'}});
        return;
    }

    const project = await prisma.project.create({data: {name, description}});

    res.status(201).json(project) ;

});



router.get('/', async (req: Request, res: Response) => {

    const projects = await prisma.project.findMany();

    res.status(200).json(projects);

});

router.get('/:id',async (req: Request, res: Response) => {

    const id = req.params.id as string;

    const project = await prisma.project.findUnique({where : {id}})

    if (!project){
        res.status(400).json({error: {message: 'Project not found', code: 'NOT_FOUND'}});
        return;
    }

    res.status(200).json(project);


} )



