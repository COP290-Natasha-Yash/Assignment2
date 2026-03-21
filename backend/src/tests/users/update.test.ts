import request from 'supertest';
import app from '../../index';
import { clearDatabase, seedUser, loginUser } from '../helpers/testHelpers';
import path from 'path';
import fs from 'fs';

let userCookie: string;

beforeAll(async () => {
  await clearDatabase();
  await seedUser('Original Name', 'update@test.com', 'update_u', 'pass123');
  userCookie = await loginUser('update_u', 'pass123');

  // Create a dummy file for testing uploads if it doesn't exist
  const dummyFilePath = path.join(__dirname, 'dummy.jpg');
  if (!fs.existsSync(dummyFilePath)) {
    fs.writeFileSync(dummyFilePath, 'dummy image content');
  }
});

afterAll(async () => {
  await clearDatabase();
  // Cleanup the dummy file
  const dummyFilePath = path.join(__dirname, 'dummy.jpg');
  if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);
});

describe('PATCH /api/users/me (Multipart Upload)', () => {
  it('1. Should update the name using multipart/form-data', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie)
      .field('name', 'Yash Vaishnav'); //We Use .field for text in multipart forms

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Yash Vaishnav');
  });

  it('2. Should successfully upload an avatar and return the URL', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie)
      .attach('avatar', path.join(__dirname, 'dummy.jpg')); // Use .attach for files

    expect(res.status).toBe(200);
    expect(res.body.avatar).toMatch(/^\/uploads\//); // Should start with /uploads/
  });

  it('3. Should update both name and avatar simultaneously', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie)
      .field('name', 'Combo Update')
      .attach('avatar', path.join(__dirname, 'dummy.jpg'));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Combo Update');
    expect(res.body.avatar).toMatch(/^\/uploads\//);
  });

  it('4. Should return 400 if name is empty', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie)
      .field('name', '   '); // Empty whitespace

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Name Cannot be Empty');
  });
});
