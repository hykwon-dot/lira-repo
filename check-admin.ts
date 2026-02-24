
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const userCount = await prisma.user.count();
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@admin.com' }
    });
    console.log('Total Users:', userCount);
    console.log('Admin User:', admin);
  } catch (error) {
    console.error('Error connecting to DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
