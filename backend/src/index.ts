import express from 'express';
import authRouter from './routes/auth/index';
import projectRouter from './routes/projects';


const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/projects', projectRouter);


app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});