const { getPrismaClient } = require('./src/lib/prisma.ts');
const { hashPassword } = require('./src/lib/hash.ts');

async function completeScenarioTest() {
  console.log('🎯 완전한 시나리오 테스트 시작...\n');

  try {
    const prisma = await getPrismaClient();

    // 1. 새로운 탐정 회원가입 시뮬레이션
    console.log('1️⃣ 탐정 회원가입 시뮬레이션...');
    const testEmail = `test-investigator-${Date.now()}@example.com`;
    const hashedPwd = await hashPassword('TestPassword123!');
    
    const newUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: '테스트 탐정',
        password: hashedPwd,
        role: 'INVESTIGATOR'
      }
    });

    const newInvestigator = await prisma.investigatorProfile.create({
      data: {
        userId: newUser.id,
        specialties: ['FIELD_TAIL', 'UNDERCOVER'],
        experienceYears: 5,
        contactPhone: '01012345678',
        status: 'PENDING'
      }
    });

    console.log(`✅ 새 탐정 생성됨: ID ${newInvestigator.id}, 상태: ${newInvestigator.status}`);

    // 2. 관리자 대시보드에서 PENDING 탐정 확인
    console.log('\n2️⃣ 관리자 대시보드 PENDING 탐정 확인...');
    const pendingBefore = await prisma.investigatorProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: true }
    });
    console.log(`승인 전 PENDING 탐정 수: ${pendingBefore.length}`);
    
    const targetInvestigator = pendingBefore.find(inv => inv.id === newInvestigator.id);
    if (!targetInvestigator) {
      throw new Error('생성된 탐정이 PENDING 목록에 없습니다!');
    }
    console.log(`✅ 대상 탐정 확인됨: ${targetInvestigator.user.name}`);

    // 3. 관리자 승인 처리
    console.log('\n3️⃣ 관리자 승인 처리...');
    const approved = await prisma.investigatorProfile.update({
      where: { id: newInvestigator.id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: 1,
        reviewNote: '테스트 승인 완료'
      }
    });
    console.log(`✅ 승인 처리 완료: 상태 ${approved.status}`);

    // 4. 승인 후 상태 확인
    console.log('\n4️⃣ 승인 후 상태 확인...');
    const pendingAfter = await prisma.investigatorProfile.findMany({
      where: { status: 'PENDING' }
    });
    const approvedAfter = await prisma.investigatorProfile.findMany({
      where: { status: 'APPROVED' }
    });
    
    console.log(`승인 후 PENDING 탐정 수: ${pendingAfter.length}`);
    console.log(`승인 후 APPROVED 탐정 수: ${approvedAfter.length}`);
    
    const isInApproved = approvedAfter.some(inv => inv.id === newInvestigator.id);
    const isInPending = pendingAfter.some(inv => inv.id === newInvestigator.id);
    
    console.log(`승인된 목록에 포함: ${isInApproved ? '✅' : '❌'}`);
    console.log(`대기 목록에 포함: ${isInPending ? '❌' : '✅'}`);

    // 5. 탐정 목록 API 테스트
    console.log('\n5️⃣ 탐정 목록 API 테스트...');
    const publicInvestigators = await prisma.investigatorProfile.findMany({
      where: { status: 'APPROVED' },
      include: { user: true }
    });
    
    const isInPublicList = publicInvestigators.some(inv => inv.id === newInvestigator.id);
    console.log(`공개 탐정 목록에 포함: ${isInPublicList ? '✅' : '❌'}`);
    console.log(`공개 탐정 총 수: ${publicInvestigators.length}`);

    // 6. 로그인 테스트
    console.log('\n6️⃣ 승인된 탐정 로그인 테스트...');
    const { verifyPassword } = require('./src/lib/hash.ts');
    const { signToken } = require('./src/lib/jwt.ts');
    
    const loginUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { investigator: true }
    });
    
    if (!loginUser) {
      throw new Error('로그인 사용자를 찾을 수 없습니다!');
    }
    
    const passwordValid = await verifyPassword('TestPassword123!', loginUser.password);
    console.log(`비밀번호 검증: ${passwordValid ? '✅' : '❌'}`);
    
    if (loginUser.investigator?.status === 'APPROVED') {
      const token = signToken({ userId: loginUser.id, role: loginUser.role });
      console.log(`✅ 로그인 성공, JWT 토큰 생성됨`);
    } else {
      console.log(`❌ 탐정 상태: ${loginUser.investigator?.status}`);
    }

    // 7. 정리 (테스트 데이터 삭제)
    console.log('\n7️⃣ 테스트 데이터 정리...');
    await prisma.investigatorProfile.delete({ where: { id: newInvestigator.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log('✅ 테스트 데이터 삭제 완료');

    console.log('\n🎉 모든 시나리오 테스트 성공!');
    return true;

  } catch (error) {
    console.error('❌ 시나리오 테스트 실패:', error);
    return false;
  }
}

completeScenarioTest().then(success => {
  if (success) {
    console.log('\n✅ 전체 시나리오 테스트 통과 - 시스템 정상');
  } else {
    console.log('\n❌ 시나리오 테스트 실패 - 수정 필요');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('테스트 실행 오류:', error);
  process.exit(1);
});