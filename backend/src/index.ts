import express from 'express';
import authRouter from './routes/auth/index';
import projectsRouter from './routes/projects';
import boardsRouter from './routes/boards';
import columnsRouter from './routes/columns';
import tasksRouter from './routes/tasks';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth';
import commentsRouter from './routes/comments';

const app = express();

app.use(express.json());

app.use(cookieParser());

app.use('/api/auth', authRouter);
app.use('/api/projects', authenticate,projectsRouter);
app.use('/api/projects', authenticate,boardsRouter);
app.use('/api/projects', authenticate, columnsRouter);
app.use('/api/projects',authenticate,tasksRouter);
app.use('/api/tasks', authenticate, commentsRouter);

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});