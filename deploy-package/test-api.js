const { getPrismaClient } = require('./src/lib/prisma.ts');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    const prisma = await getPrismaClient();
    
    const userCount = await prisma.user.count();
    console.log('✅ Database connected successfully');
    console.log(`Total users: ${userCount}`);
    
    const investigators = await prisma.investigatorProfile.findMany({
      where: { status: 'APPROVED' },
      include: { user: true },
      take: 5
    });
    console.log(`Approved investigators: ${investigators.length}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDatabase();