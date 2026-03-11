import express from 'express';
import authRouter from './routes/auth';


const app = express();

app.use(express.json());

app.use('/api/auth', authRouter);


app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});