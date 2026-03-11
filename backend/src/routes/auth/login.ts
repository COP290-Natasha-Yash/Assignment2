import express, {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';




const router = express.Router();


const JWT_SECRET  = process.env.JWT_SECRET || 'supersecret';

router.post('/login', async (req: Request, res: Response) => {
    
    const {email, password} = req.body;

    if (!email || !password){
        res.status(400).json({error: {message: 'All Fields are Required.', code: 'BAD_REQUEST'}});
        return;
    }

    const user = await prisma.user.findUnique({where: {email}});

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

    const refreshToken = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn : '1d'});

    await prisma.user.update({where: {id: user.id}, data: {refreshToken: refreshToken}});

    res.status(200).json({token , refreshToken, user : {id: user.id, name: user.name, email: user.email, role: user.role }}) ;

});

export default router;