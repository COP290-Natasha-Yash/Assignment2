import express, {Request, Response} from 'express';

import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';




const router = express.Router();


const JWT_SECRET  = process.env.JWT_SECRET || 'supersecret';

router.post('', async (req:Request, res:Response) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken){
        res.status(400).json({error: {message: 'Refresh token required', code: 'BAD_REQUEST'}});
        return;
    }

    const user = await prisma.user.findUnique({where: {refreshToken}});

    if (!user){
        res.status(401).json({error: {message: 'Invalid refresh token', code: 'UNAUTHORIZED'}});
        return;
    }

    const accessToken = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn: '15m'});

    res.status(200).json({accessToken});

});

export default router;