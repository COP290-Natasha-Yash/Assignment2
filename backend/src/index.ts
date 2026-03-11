import express from 'express';
import authRouter from './routes/auth/index';
import projectsRouter from './routes/projects';
import boardsRouter from './routes/boards';
import columnsRouter from './routes/columns';

const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects', boardsRouter);
app.use('/api/projects', columnsRouter)


app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});