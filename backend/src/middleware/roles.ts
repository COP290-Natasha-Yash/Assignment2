import {Request, Response, NextFunction} from 'express';

import {prisma} from '../prisma';


export const requireGlobalAdmin = async (req:Request, res:Response, next:NextFunction) =>{

    const userId = req.userId;
    const user = await prisma.user.findUnique({where: {id: userId}});
    if (!user){
        res.status(400).json({error: {message: 'Login Required', code: 'BAD_REQUEST'}});
        return;
    }


    if (user.globalRole !=='GLOBAL_ADMIN'){
        res.status(403).json({error: {message: 'Global Admin Access Required', code: 'FORBIDDEN'}});
        return;
    }
    else{
        next();
    }

};

export const requireProjectRole = (allowedRoles: string[]) => {
    return async (req:Request, res:Response, next: NextFunction) =>{

        const user = await prisma.user.findUnique({where: {id: req.userId}});
        if (user.globalRole === 'GLOBAL_ADMIN') {
            next();
            return;
        }


        const projectId = req.params.id as string;

        const member = await prisma.projectMember.findFirst({where: {userId: req.userId, projectId}});


        if (!member){
            res.status(403).json({error: {message: 'You Are Not a Member of This Project', code: 'FORBIDDEN'}});
            return;
        }

        if (!allowedRoles.includes(member.role)){
            res.status(403).json({error: {message: 'You Do Not Have Permission to Do This', code: 'FORBIDDEN'}});
            return;
        }
        else{
            next();
        }
    }
};
