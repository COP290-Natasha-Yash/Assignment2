import { prisma } from '../prisma';
import bcrypt from 'bcrypt';

export async function seedTestDb() {
  await prisma.user.deleteMany();
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Global Admin',
      email: 'admin@taskboard.com',
      password: hashedPassword,
      username: 'admin',
      globalRole: 'GLOBAL_ADMIN'
    }
  });
}