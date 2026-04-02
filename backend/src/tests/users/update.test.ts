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
  // Test 1: Updating just the name
  it('1. Should update the name', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie) // <-- ADD THIS LINE
      .send({ name: 'Yash Vaishnav' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Yash Vaishnav');
  });

  // Test 2 & 3: Uploading an avatar (and name)
  it('3. Should update both name and avatar simultaneously', async () => {
    const rawBase64Avatar =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie)
      .send({
        name: 'Yash Vaishnav',
        avatar: rawBase64Avatar,
      });

    expect(res.status).toBe(200);

    // Assert that the backend correctly added your expected prefix!
    expect(res.body.avatar).toBe(`data:image/jpeg;base64,${rawBase64Avatar}`);
  });

  // Test 4: Empty name check
  it('4. Should return 400 if name is empty', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Cookie', userCookie) // <-- ADD THIS LINE
      .send({ name: '   ' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Name Cannot be Empty');
  });
});
