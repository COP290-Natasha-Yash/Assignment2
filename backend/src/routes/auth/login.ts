import express, {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';




const router = express.Router();


const JWT_SECRET  = process.env.JWT_SECRET || 'supersecret';

router.post('/login', async (req: Request, res: Response) => {
    
    const {email, username, password} = req.body;

    if ((!email && !username) || !password){
        res.status(400).json({error: {message: 'All Fields are Required.', code: 'BAD_REQUEST'}});
        return;
    }

    const user = await prisma.user.findFirst({where: {OR: [{email}, {username}]}});

    if (!user){
        res.status(401).json({error: {message: 'Invalid Credentials', code: 'UNAUTHORIZED'}});
        return;
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid ){
        res.status(401).json({error: {message: 'Invalid Credentials', code: 'UNAUTHORIZED'}});
        return;
    }

    const token = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn: '15m'});
    res.cookie('token', token, {httpOnly: true, secure: false, maxAge: 15*60*1000});

    const refreshToken = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn : '1d'});
    res.cookie('refreshToken', refreshToken, {httpOnly: true, secure: false, maxAge: 24*60*60*1000});


    await prisma.user.update({where: {id: user.id}, data: {refreshToken: refreshToken}});

    
    res.status(200).json({user: {id: user.id, name: user.name, email: user.email, role: user.role}});

});

export default router;