import express, {Request, Response} from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';




const router = express.Router();


const JWT_SECRET  = process.env.JWT_SECRET || 'supersecret'

router.post('/register', async (req: Request, res: Response) =>{
    const {name, email, password} = req.body;

    if (!name || !email || !password){
        res.status(400).json({error: {message: 'All fields are required.', code: 'BAD_REQUEST'}});
        return;
    }

    const existing = await prisma.user.findUnique({where: {email}});
    if (existing){
        res.status(400).json({error: {message: 'Email already in use.', code: 'EMAIL_TAKEN'}});
        return;
    }

    const hashpass = await bcrypt.hash(password,10);

    const user = await prisma.user.create({data: {name, password: hashpass, email}});

    const token = jwt.sign({userId: user.id}, JWT_SECRET, {expiresIn: '15m'});

    res.status(201).json({token , user : {id: user.id, name: user.name, email: user.email, role: user.role }}) ;

});


router.post('/login', async (req: Request, res: Response) => {
    const email = req.body.email;
    const password = req.body.password;

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

    await prisma.user.update({
        where: {id: user.id},
        data: {refreshToken: refreshToken}
    });
    

    res.status(200).json({token , refreshToken, user : {id: user.id, name: user.name, email: user.email, role: user.role }}) ;

});


router.post('/refresh', async (req:Request, res:Response) => {
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

router.post('/logout', async (req: Request, res:Response) => {
    const userId = req.body.id;

    if (!userId){
        res.status(400).json({error: {message: 'User ID Required', code: 'BAD_REQUEST'}});
        return;
    }

    await prisma.user.update({
        where: {id: userId},
        data: {refreshToken: null}
    });

    res.status(200).json ({message: 'Logged Out Successfully'});

});


export default router;