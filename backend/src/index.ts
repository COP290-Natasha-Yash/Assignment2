import express from 'express';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: "Backend is working!" });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});