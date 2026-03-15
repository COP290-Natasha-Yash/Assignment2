import { execSync } from 'child_process';
import { prisma } from '../prisma';
import bcrypt from 'bcrypt';

export default async function setup() {
  process.env.DATABASE_URL = 'file:./test.db';
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.create({
    data: {
      name: 'Global Admin',
      email: 'globaladmin@test.com',
      password: hashedPassword,
      username: 'global_admin',
      globalRole: 'GLOBAL_ADMIN',
    },
  });
}
