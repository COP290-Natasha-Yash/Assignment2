import { prisma } from '../src/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@taskboard.com' },
    update: {},
    create: {
      name: 'Global Admin',
      email: 'admin@taskboard.com',
      username: '_admin_',
      password: hashedPassword,
      globalRole: 'GLOBAL_ADMIN'
    }
  });

  console.log('Admin seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());