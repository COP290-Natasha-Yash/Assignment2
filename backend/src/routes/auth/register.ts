import express, {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma';




const router = express.Router();


const JWT_SECRET  = process.env.JWT_SECRET || 'supersecret';

router.post('/register', async (req: Request, res: Response) =>{
    const {name, email, password} = req.body;

    if (!name || !email || !password){
        res.status(400).json({error: {message: 'All Fields are Required.', code: 'BAD_REQUEST'}});
        return;
    }

    const existing = await prisma.user.findUnique({where: {email}});
    if (existing){
        res.status(400).json({error: {message: 'Email Already in Use.', code: 'EMAIL_TAKEN'}});
        return;
    }

    const hashpass = await bcrypt.hash(password,10);

    const user = await prisma.user.create({data: {name, password: hashpass, email}});

    const token = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn: '15m'});

    res.status(201).json({token , user : {id: user.id, name: user.name, email: user.email, role: user.role }}) ;

});

export default router;