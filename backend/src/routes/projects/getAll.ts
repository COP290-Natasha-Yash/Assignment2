import express, {Request, Response} from 'express';

import {prisma} from '../../prisma';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {

    const projects = await prisma.project.findMany();

    res.status(200).json(projects);

});

export default router;