import fs from 'fs';
import { prisma } from '../prisma';

export default async function teardown() {
  await prisma.$disconnect();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const files = ['./test.db', './test.db-wal', './test.db-shm'];
  for (const file of files) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        // ignore if still locked
      }
    }
  }
}