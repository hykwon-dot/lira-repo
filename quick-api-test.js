const { getPrismaClient } = require('./src/lib/prisma.ts');
const { verifyPassword } = require('./src/lib/hash.ts');
const { signToken } = require('./src/lib/jwt.ts');

async function testCoreAPIs() {
  console.log('🔍 핵심 API 기능 테스트 시작...\n');

  // 1. 데이터베이스 연결 테스트
  try {
    console.log('1️⃣ 데이터베이스 연결 테스트...');
    const prisma = await getPrismaClient();
    const userCount = await prisma.user.count();
    console.log(`✅ DB 연결 성공 - 사용자 수: ${userCount}`);
  } catch (error) {
    console.log(`❌ DB 연결 실패: ${error.message}`);
    return false;
  }

  // 2. 비밀번호 해시/검증 테스트
  try {
    console.log('\n2️⃣ 비밀번호 해시/검증 테스트...');
    const { hashPassword } = require('./src/lib/hash.ts');
    const testPassword = 'TestPassword123!';
    const hashed = await hashPassword(testPassword);
    const isValid = await verifyPassword(testPassword, hashed);
    const isInvalid = await verifyPassword('WrongPassword', hashed);
    
    if (isValid && !isInvalid) {
      console.log('✅ 비밀번호 해시/검증 정상');
    } else {
      console.log('❌ 비밀번호 해시/검증 오류');
      return false;
    }
  } catch (error) {
    console.log(`❌ 비밀번호 테스트 실패: ${error.message}`);
    return false;
  }

  // 3. JWT 토큰 테스트
  try {
    console.log('\n3️⃣ JWT 토큰 테스트...');
    const { verifyToken } = require('./src/lib/jwt.ts');
    const payload = { userId: 1, role: 'USER' };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    
    if (decoded && decoded.userId === 1 && decoded.role === 'USER') {
      console.log('✅ JWT 토큰 생성/검증 정상');
    } else {
      console.log('❌ JWT 토큰 생성/검증 오류');
      return false;
    }
  } catch (error) {
    console.log(`❌ JWT 테스트 실패: ${error.message}`);
    return false;
  }

  // 4. 환경 변수 테스트
  try {
    console.log('\n4️⃣ 환경 변수 테스트...');
    const requiredEnvs = ['DATABASE_URL', 'JWT_SECRET', 'OPENAI_API_KEY'];
    const missing = requiredEnvs.filter(key => !process.env[key]);
    
    if (missing.length === 0) {
      console.log('✅ 모든 환경 변수 설정됨');
    } else {
      console.log(`⚠️ 환경 변수 누락: ${missing.join(', ')} (폴백 사용)`);
    }
  } catch (error) {
    console.log(`❌ 환경 변수 테스트 실패: ${error.message}`);
  }

  // 5. 데이터베이스 스키마 검증
  try {
    console.log('\n5️⃣ 데이터베이스 스키마 검증...');
    const prisma = await getPrismaClient();
    
    // 주요 테이블 존재 확인
    const tables = [
      { name: 'User', query: () => prisma.user.count() },
      { name: 'InvestigatorProfile', query: () => prisma.investigatorProfile.count() },
      { name: 'Scenario', query: () => prisma.scenario.count() },
      { name: 'Conversation', query: () => prisma.conversation.count() }
    ];

    for (const table of tables) {
      try {
        const count = await table.query();
        console.log(`  ✅ ${table.name}: ${count}개 레코드`);
      } catch (error) {
        console.log(`  ❌ ${table.name}: 테이블 접근 실패`);
        return false;
      }
    }
  } catch (error) {
    console.log(`❌ 스키마 검증 실패: ${error.message}`);
    return false;
  }

  console.log('\n🎉 모든 핵심 기능 테스트 통과!');
  return true;
}

testCoreAPIs().then(success => {
  if (success) {
    console.log('\n✅ 시스템 준비 완료 - 배포 가능');
    process.exit(0);
  } else {
    console.log('\n❌ 시스템 문제 발견 - 수정 필요');
    process.exit(1);
  }
}).catch(error => {
  console.error('테스트 실행 오류:', error);
  process.exit(1);
});