import express, {Request, Response} from 'express'

import { prisma } from '../../prisma';

const router = express.Router();

router.patch('/:id/boards/:boardId/tasks/:taskId/move', async (req: Request, res: Response) => {

    const projectId = req.params.id as string;

    const project = await prisma.project.findUnique({where : {id : projectId}});

    if (!project){
        res.status(404).json({error: {message: 'Project Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const boardId = req.params.boardId as string;

    const board = await prisma.board.findUnique({where : {id: boardId}});

    if(!board){
        res.status(404).json({error: {message: 'Board Not Found', code: 'NOT_FOUND'}});
        return;
    }

    const taskId = req.params.taskId as string;

    const task = await prisma.task.findUnique({where: {id: taskId}});

    if (!task){
        res.status(404).json({error: {message: 'Task Not Found', code: 'NOT_FOUND'}});
        return;
    }

    if (task.type === 'STORY'){
        res.status(400).json({error: {message: '"STORY" Type task is NOT Movable', code: 'INVALID_REQUEST'}});
        return;
    }

    const newColumnId = req.body.columnId ;

    if (!newColumnId){
        res.status(400).json({error: {message: 'New Column ID is Required', code: 'BAD_REQUEST'}});
        return;
    }

    const newColumn = await prisma.column.findUnique({where: {id : newColumnId}});

    if (!newColumn){
        res.status(404).json({error: {message: 'Column Not Found', code: 'NOT_FOUND'}});
        return;
    }

    if (newColumn.boardId !== boardId){
        res.status(400).json({error: {message: 'Moving Tasks Between Different Boards Not Allowed', code: 'INVALID_REQUEST'}});
        return;
    }

    const taskCount = await prisma.task.count({ where: { columnId: newColumnId } });

    if (newColumn.wipLimit && taskCount >= newColumn.wipLimit) {
        res.status(400).json({ error: { message: 'WIP limit reached', code: 'WIP_LIMIT_REACHED' } });
        return;
    }

    const updatedTask = await prisma.task.update({ where: { id: taskId }, data: { columnId: newColumnId } });

    res.status(200).json(updatedTask);

});


export default router;