import { execSync } from 'child_process';

export default async function setup() {
  process.env.DATABASE_URL = 'file:./test.db';
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}
