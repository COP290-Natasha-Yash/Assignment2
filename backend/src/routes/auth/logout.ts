import express, {Request, Response} from 'express';

import { prisma } from '../../prisma';




const router = express.Router();


router.post('/logout', async (req: Request, res:Response) => {
    
    const userId = req.body.id;

    if (!userId){
        res.status(400).json({error: {message: 'User ID Required', code: 'BAD_REQUEST'}});
        return;
    }


    const user = await prisma.user.findUnique({
        where: { id: userId }
    });


    if (!user || !user.refreshToken) {
        res.status(400).json({ error: { message: 'User is Already Logged Out or Does Not Exist.', code: 'ALREADY_LOGGED_OUT' } });
        return;
    }

    

    await prisma.user.update({
        where: {id: userId},
        data: {refreshToken: null}
    });

    res.clearCookie('token');
    res.clearCookie('refreshToken');

    res.status(200).json ({message: 'Logged Out Successfully'});

});

export default router;