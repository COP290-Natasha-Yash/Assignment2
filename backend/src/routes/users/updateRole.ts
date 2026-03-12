import express, {Request, Response} from 'express';

import {prisma} from '../../prisma';

import { requireGlobalAdmin } from '../../middleware/roles';

const router = express.Router();

router.patch('/:userId/role', requireGlobalAdmin ,async (req: Request, res: Response) => {

    const userId = req.params.userId as string;
    const user = await prisma.user.findUnique({where: {id:userId}, select: {id: true, name: true, email: true, globalRole: true, avatar: true }});
    if (!user){
        res.status(404).json({error: {message: 'User Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const role = req.body.role;
    if (!role){
        res.status(400).json({error: {message: 'Role is Required', code: 'BAD_REQUEST'}});
        return;
    }

    const updated_user = await prisma.user.update({where: {id:userId}, data: {globalRole: role}, select: {id: true, name: true, email: true, globalRole: true, avatar: true}});

    res.status(200).json(updated_user);

});

export default router;