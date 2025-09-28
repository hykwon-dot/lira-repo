const { getPrismaClient } = require('./src/lib/prisma.ts');

async function testInvestigatorApproval() {
  console.log('🔍 탐정 승인 기능 테스트 시작...\n');

  try {
    const prisma = await getPrismaClient();

    // 1. PENDING 상태인 탐정 찾기
    console.log('1️⃣ PENDING 상태 탐정 조회...');
    const pendingInvestigators = await prisma.investigatorProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: true }
    });

    console.log(`PENDING 탐정 수: ${pendingInvestigators.length}`);
    
    if (pendingInvestigators.length === 0) {
      console.log('⚠️ PENDING 상태 탐정이 없습니다. 테스트 탐정을 생성합니다...');
      
      // 테스트 탐정 생성
      const testUser = await prisma.user.create({
        data: {
          email: `test-investigator-${Date.now()}@example.com`,
          name: '테스트 탐정',
          password: 'hashedpassword',
          role: 'INVESTIGATOR'
        }
      });

      const testInvestigator = await prisma.investigatorProfile.create({
        data: {
          userId: testUser.id,
          specialties: ['FIELD_TAIL'],
          contactPhone: '01012345678',
          status: 'PENDING'
        }
      });

      console.log(`✅ 테스트 탐정 생성됨: ID ${testInvestigator.id}`);
      pendingInvestigators.push({ ...testInvestigator, user: testUser });
    }

    // 2. 첫 번째 PENDING 탐정 승인 테스트
    const targetInvestigator = pendingInvestigators[0];
    console.log(`\n2️⃣ 탐정 승인 테스트 (ID: ${targetInvestigator.id})...`);

    const beforeApproval = await prisma.investigatorProfile.findUnique({
      where: { id: targetInvestigator.id }
    });
    console.log(`승인 전 상태: ${beforeApproval?.status}`);

    // 승인 처리
    const approved = await prisma.investigatorProfile.update({
      where: { id: targetInvestigator.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: 1,
        reviewNote: '테스트 승인'
      }
    });

    console.log(`승인 후 상태: ${approved.status}`);
    console.log(`승인 시간: ${approved.reviewedAt}`);
    console.log(`승인자 ID: ${approved.reviewedById}`);

    // 3. 승인된 탐정이 목록에 나타나는지 확인
    console.log('\n3️⃣ 승인된 탐정 목록 확인...');
    const approvedInvestigators = await prisma.investigatorProfile.findMany({
      where: { status: 'APPROVED' },
      include: { user: true }
    });

    const isInApprovedList = approvedInvestigators.some(inv => inv.id === targetInvestigator.id);
    console.log(`승인된 탐정 목록에 포함됨: ${isInApprovedList ? '✅' : '❌'}`);
    console.log(`총 승인된 탐정 수: ${approvedInvestigators.length}`);

    // 4. 다시 PENDING으로 되돌리기 (다음 테스트를 위해)
    await prisma.investigatorProfile.update({
      where: { id: targetInvestigator.id },
      data: {
        status: 'PENDING',
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null
      }
    });

    console.log('\n🎉 탐정 승인 기능 테스트 완료!');
    return true;

  } catch (error) {
    console.error('❌ 탐정 승인 테스트 실패:', error);
    return false;
  }
}

testInvestigatorApproval().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('테스트 실행 오류:', error);
  process.exit(1);
});