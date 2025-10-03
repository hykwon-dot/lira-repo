const { getPrismaClient } = require('./src/lib/prisma.ts');

async function checkData() {
  try {
    const prisma = await getPrismaClient();
    
    console.log('=== 사용자 데이터 ===');
    const users = await prisma.user.findMany({
      include: {
        investigator: true,
        customerProfile: true
      }
    });
    
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Role: ${user.role}`);
      if (user.investigator) {
        console.log(`  - 탐정 상태: ${user.investigator.status}`);
        console.log(`  - 전문분야: ${JSON.stringify(user.investigator.specialties)}`);
        console.log(`  - 연락처: ${user.investigator.contactPhone}`);
      }
    });
    
    console.log('\n=== 최근 탐정 프로필 ===');
    const investigators = await prisma.investigatorProfile.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 3
    });
    
    investigators.forEach(inv => {
      console.log(`탐정 ID: ${inv.id}, 사용자: ${inv.user.name}`);
      console.log(`  전문분야: ${JSON.stringify(inv.specialties)}`);
      console.log(`  경력: ${inv.experienceYears}년`);
      console.log(`  연락처: ${inv.contactPhone}`);
      console.log(`  상태: ${inv.status}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('데이터 확인 실패:', error);
  }
}

checkData();