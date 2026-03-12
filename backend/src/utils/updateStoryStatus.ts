import {prisma} from '../prisma';
import { auditLog } from './auditLog';


export async function updateStoryStatus(parentId: string, userId: string) : Promise<void> {

    const parent = await prisma.task.findUnique({where: {id: parentId}});

    
    const children = await prisma.task.findMany({where: {parentId}});
    if (children.length===0){
        return;
    }

    let w =0,x=0,y=0,z=0;

    for (let i = 0 ; i<children.length; i++){
        if (children[i].status === 'TO_DO'){
            w=1;
        }
        else if (children[i].status === 'IN_PROGRESS'){
            x =1;
        }
        else if (children[i].status === 'IN_REVIEW'){
            y=1;
        }

        else{
            z=1;
        }
    }

    let newStatus = ''

    if ( x===1){
        newStatus = 'IN_PROGRESS'
    }

    else if (w===1  && y===0 && z===0){
        newStatus = 'TO_DO'
    }

    else if (w===0  && y===1 && z===0){
        newStatus = 'IN_REVIEW'
    }

    else if (w===0  && y===1 && z===1){
        newStatus = 'IN_REVIEW'
    }

    else if (w===0  && y===0 && z===1){
        newStatus = 'DONE'
    }

    else {
        newStatus = 'IN_PROGRESS'
    }

    
    const oldStatus = parent!.status;

    await prisma.task.update({where: {id: parentId}, data: {status: newStatus}});

    if (oldStatus !== newStatus){
        await auditLog(parentId, userId, 'STATUS_CHANGED', oldStatus, newStatus);
    }
    
};