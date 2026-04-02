import request from 'supertest';
import app from '../index';

export async function registerUser(
  name: string,
  email: string,
  password: string,
  username: string
) {
  const response = await request(app).post('/api/auth/register').send({
    name,
    email,
    password,
    username,
  });
  return response;
}

export async function login(username: string, password: string) {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username, password });
  return response.headers['set-cookie'];
}

export async function loginAdmin() {
  return login('global_admin', 'admin123');
}
