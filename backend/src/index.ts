import express from 'express';
import authRouter from './routes/auth/index';
import projectsRouter from './routes/projects';
import boardsRouter from './routes/boards';
import columnsRouter from './routes/columns';
import tasksRouter from './routes/tasks';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth';
import commentsRouter from './routes/comments';
import notificationsRouter from './routes/notifications';
import membersRouter from './routes/members';
import usersRouter from './routes/users';
import cors from 'cors';

const app = express();

app.use(express.json({ limit: '10mb' }));

app.use(cookieParser());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/projects', authenticate, projectsRouter);
app.use('/api/projects', authenticate, boardsRouter);
app.use('/api/projects', authenticate, columnsRouter);
app.use('/api/projects', authenticate, tasksRouter);
app.use('/api/projects', authenticate, commentsRouter);
app.use('/api/notifications', authenticate, notificationsRouter);
app.use('/api/projects', authenticate, membersRouter);
app.use('/api/users', authenticate, usersRouter);

export default app;
