import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    const banners = await prisma.banner.findMany();
    console.log('Banners found:', banners);
    
    const awards = await prisma.award.findMany();
    console.log('Awards found:', awards);
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
