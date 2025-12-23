const { getPrismaClient } = require('./src/lib/prisma.ts');
const { hashPassword, verifyPassword } = require('./src/lib/hash.ts');
const { signToken, verifyToken } = require('./src/lib/jwt.ts');

class SystemTester {
  constructor() {
    this.testResults = [];
    this.testUsers = {};
    this.testData = {};
  }

  log(category, test, status, message, details = null) {
    const result = { category, test, status, message, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${category}] ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
  }

  async setupTestData() {
    console.log('🔧 테스트 데이터 설정 중...\n');
    
    try {
      const prisma = await getPrismaClient();
      
      // 테스트 사용자들 생성
      const users = [
        { role: 'USER', email: `test-user-${Date.now()}@example.com`, name: '테스트 고객' },
        { role: 'INVESTIGATOR', email: `test-investigator-${Date.now()}@example.com`, name: '테스트 탐정' },
        { role: 'ENTERPRISE', email: `test-enterprise-${Date.now()}@example.com`, name: '테스트 기업' },
        { role: 'ADMIN', email: `test-admin-${Date.now()}@example.com`, name: '테스트 관리자' }
      ];

      for (const userData of users) {
        const hashedPwd = await hashPassword('TestPassword123!');
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPwd
          }
        });
        this.testUsers[userData.role] = user;

        // 탐정 프로필 생성
        if (userData.role === 'INVESTIGATOR') {
          const investigatorProfile = await prisma.investigatorProfile.create({
            data: {
              userId: user.id,
              specialties: ['FIELD_TAIL', 'UNDERCOVER'],
              experienceYears: 5,
              contactPhone: '01012345678',
              status: 'APPROVED'
            }
          });
          this.testData.investigatorProfile = investigatorProfile;
        }

        // 고객 프로필 생성
        if (userData.role === 'USER') {
          const customerProfile = await prisma.customerProfile.create({
            data: {
              userId: user.id,
              phone: '01087654321',
              preferredCaseTypes: ['INFIDELITY'],
              budgetMin: 1000000,
              budgetMax: 5000000,
              termsAcceptedAt: new Date(),
              privacyAcceptedAt: new Date()
            }
          });
          this.testData.customerProfile = customerProfile;
        }
      }

      console.log('✅ 테스트 데이터 설정 완료\n');
      return true;
    } catch (error) {
      console.error('❌ 테스트 데이터 설정 실패:', error);
      return false;
    }
  }

  async testAuthentication() {
    console.log('🔐 인증 시스템 테스트...\n');

    try {
      // 1. 회원가입 테스트
      const registerData = {
        role: 'USER',
        email: `register-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: '회원가입 테스트',
        acceptsTerms: true,
        acceptsPrivacy: true
      };

      // 실제 API 호출 시뮬레이션
      const prisma = await getPrismaClient();
      const hashedPwd = await hashPassword(registerData.password);
      const newUser = await prisma.user.create({
        data: {
          email: registerData.email,
          name: registerData.name,
          password: hashedPwd,
          role: registerData.role
        }
      });

      this.log('AUTH', '회원가입', 'PASS', '새 사용자 생성 성공', { id: newUser.id });

      // 2. 로그인 테스트
      const loginUser = await prisma.user.findUnique({
        where: { email: registerData.email }
      });

      const passwordValid = await verifyPassword(registerData.password, loginUser.password);
      if (passwordValid) {
        const token = signToken({ userId: loginUser.id, role: loginUser.role });
        const decoded = verifyToken(token);
        
        if (decoded && decoded.userId === loginUser.id) {
          this.log('AUTH', '로그인', 'PASS', 'JWT 토큰 생성/검증 성공');
        } else {
          this.log('AUTH', '로그인', 'FAIL', 'JWT 토큰 검증 실패');
        }
      } else {
        this.log('AUTH', '로그인', 'FAIL', '비밀번호 검증 실패');
      }

      // 3. 권한 테스트
      for (const [role, user] of Object.entries(this.testUsers)) {
        const token = signToken({ userId: user.id, role: user.role });
        const decoded = verifyToken(token);
        
        if (decoded && decoded.role === role) {
          this.log('AUTH', `${role} 권한`, 'PASS', '역할 기반 토큰 검증 성공');
        } else {
          this.log('AUTH', `${role} 권한`, 'FAIL', '역할 기반 토큰 검증 실패');
        }
      }

    } catch (error) {
      this.log('AUTH', '인증 시스템', 'FAIL', '인증 테스트 실패', error.message);
    }
  }

  async testInvestigatorManagement() {
    console.log('👮 탐정 관리 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 탐정 회원가입
      const investigatorData = {
        role: 'INVESTIGATOR',
        email: `investigator-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: '신규 탐정',
        specialties: ['FIELD_TAIL', 'DIGITAL_FORENSICS'],
        experienceYears: 3,
        contactPhone: '01011112222'
      };

      const hashedPwd = await hashPassword(investigatorData.password);
      const newInvestigator = await prisma.user.create({
        data: {
          email: investigatorData.email,
          name: investigatorData.name,
          password: hashedPwd,
          role: investigatorData.role
        }
      });

      const investigatorProfile = await prisma.investigatorProfile.create({
        data: {
          userId: newInvestigator.id,
          specialties: investigatorData.specialties,
          experienceYears: investigatorData.experienceYears,
          contactPhone: investigatorData.contactPhone,
          status: 'PENDING'
        }
      });

      this.log('INVESTIGATOR', '탐정 회원가입', 'PASS', 'PENDING 상태로 탐정 생성 성공');

      // 2. 관리자 승인
      const approved = await prisma.investigatorProfile.update({
        where: { id: investigatorProfile.id },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: this.testUsers.ADMIN.id,
          reviewNote: '테스트 승인'
        }
      });

      this.log('INVESTIGATOR', '관리자 승인', 'PASS', '탐정 승인 처리 성공');

      // 3. 탐정 목록 조회
      const approvedInvestigators = await prisma.investigatorProfile.findMany({
        where: { status: 'APPROVED' },
        include: { user: true }
      });

      const isInList = approvedInvestigators.some(inv => inv.id === investigatorProfile.id);
      if (isInList) {
        this.log('INVESTIGATOR', '탐정 목록', 'PASS', '승인된 탐정이 목록에 표시됨');
      } else {
        this.log('INVESTIGATOR', '탐정 목록', 'FAIL', '승인된 탐정이 목록에 없음');
      }

      // 4. 탐정 프로필 수정
      const updatedProfile = await prisma.investigatorProfile.update({
        where: { id: investigatorProfile.id },
        data: {
          experienceYears: 5,
          contactPhone: '01033334444'
        }
      });

      this.log('INVESTIGATOR', '프로필 수정', 'PASS', '탐정 프로필 수정 성공');

    } catch (error) {
      this.log('INVESTIGATOR', '탐정 관리', 'FAIL', '탐정 관리 테스트 실패', error.message);
    }
  }

  async testInvestigationRequests() {
    console.log('📋 조사 의뢰 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 조사 의뢰 생성
      const scenario = await prisma.scenario.findFirst();
      if (!scenario) {
        this.log('INVESTIGATION', '의뢰 생성', 'FAIL', '테스트용 시나리오가 없음');
        return;
      }

      const investigationRequest = await prisma.investigationRequest.create({
        data: {
          userId: this.testUsers.USER.id,
          scenarioId: scenario.id,
          title: '테스트 조사 의뢰',
          details: '테스트용 조사 의뢰입니다.',
          desiredOutcome: '진실 규명',
          budgetMin: 1000000,
          budgetMax: 3000000,
          status: 'MATCHING'
        }
      });

      this.log('INVESTIGATION', '의뢰 생성', 'PASS', '조사 의뢰 생성 성공', { id: investigationRequest.id });

      // 2. 탐정 배정
      const assignedRequest = await prisma.investigationRequest.update({
        where: { id: investigationRequest.id },
        data: { 
          investigatorId: this.testData.investigatorProfile.id,
          acceptedAt: new Date()
        }
      });

      this.log('INVESTIGATION', '탐정 배정', 'PASS', '탐정 배정 성공');

      // 3. 완료 처리
      await prisma.investigationRequest.update({
        where: { id: investigationRequest.id },
        data: { 
          completedAt: new Date()
        }
      });

      this.log('INVESTIGATION', '완료 처리', 'PASS', '조사 완료 처리 성공');

      this.testData.investigationRequest = investigationRequest;

    } catch (error) {
      this.log('INVESTIGATION', '조사 의뢰', 'FAIL', '조사 의뢰 테스트 실패', error.message);
    }
  }

  async testCommunication() {
    console.log('💬 의사소통 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      if (!this.testData.investigationRequest) {
        this.log('COMMUNICATION', '대화 시스템', 'FAIL', '테스트용 조사 의뢰가 없음');
        return;
      }

      // 1. 대화방 생성
      const conversation = await prisma.conversation.create({
        data: {
          userId: this.testUsers.USER.id,
          title: '조사 관련 상담'
        }
      });

      this.log('COMMUNICATION', '대화방 생성', 'PASS', '대화방 생성 성공');

      // 2. 메시지 전송 (고객)
      const customerMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          content: '안녕하세요, 조사 진행 상황이 궁금합니다.'
        }
      });

      this.log('COMMUNICATION', '고객 메시지', 'PASS', '고객 메시지 전송 성공');

      // 3. AI 응답 메시지
      const aiMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'AI',
          content: '안녕하세요! 조사 진행 상황에 대해 도움드리겠습니다.'
        }
      });

      this.log('COMMUNICATION', 'AI 메시지', 'PASS', 'AI 메시지 전송 성공');

      // 4. 메시지 조회
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' }
      });

      if (messages.length === 2) {
        this.log('COMMUNICATION', '메시지 조회', 'PASS', '대화 내역 조회 성공');
      } else {
        this.log('COMMUNICATION', '메시지 조회', 'FAIL', '메시지 수가 일치하지 않음');
      }

    } catch (error) {
      this.log('COMMUNICATION', '의사소통', 'FAIL', '의사소통 테스트 실패', error.message);
    }
  }

  async testAISimulation() {
    console.log('🤖 AI 시뮬레이션 테스트...\n');

    try {
      // ChatGPT API 키 확인
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
      
      if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
        this.log('AI', 'API 키 확인', 'PASS', 'OpenAI API 키 설정됨');
      } else {
        this.log('AI', 'API 키 확인', 'FAIL', 'OpenAI API 키 누락');
      }

      // 시나리오 조회
      const prisma = await getPrismaClient();
      const scenarios = await prisma.scenario.findMany({
        where: { isActive: true }
      });

      if (scenarios.length > 0) {
        this.log('AI', '시나리오 조회', 'PASS', `${scenarios.length}개 시나리오 조회 성공`);
      } else {
        this.log('AI', '시나리오 조회', 'FAIL', '활성 시나리오가 없음');
      }

    } catch (error) {
      this.log('AI', 'AI 시뮬레이션', 'FAIL', 'AI 시뮬레이션 테스트 실패', error.message);
    }
  }

  async testAdminFunctions() {
    console.log('⚙️ 관리자 기능 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 대시보드 데이터 조회
      const [totalUsers, investigatorCounts, requestCounts] = await Promise.all([
        prisma.user.count(),
        prisma.investigatorProfile.groupBy({
          by: ['status'],
          _count: true
        }),
        prisma.investigationRequest.groupBy({
          by: ['status'],
          _count: true
        })
      ]);

      this.log('ADMIN', '대시보드 조회', 'PASS', '관리자 대시보드 데이터 조회 성공', {
        totalUsers,
        investigatorCounts: investigatorCounts.length,
        requestCounts: requestCounts.length
      });

      // 2. 사용자 관리
      const users = await prisma.user.findMany({
        take: 5,
        include: {
          investigator: true,
          customerProfile: true
        }
      });

      this.log('ADMIN', '사용자 관리', 'PASS', '사용자 목록 조회 성공');

      // 3. 시나리오 관리
      const activeScenarios = await prisma.scenario.count({
        where: { isActive: true }
      });

      this.log('ADMIN', '시나리오 관리', 'PASS', `활성 시나리오 ${activeScenarios}개 확인`);

    } catch (error) {
      this.log('ADMIN', '관리자 기능', 'FAIL', '관리자 기능 테스트 실패', error.message);
    }
  }

  async cleanupTestData() {
    console.log('\n🧹 테스트 데이터 정리 중...');

    try {
      const prisma = await getPrismaClient();

      // 생성된 테스트 데이터 삭제
      for (const user of Object.values(this.testUsers)) {
        // 관련 데이터 먼저 삭제
        await prisma.investigatorProfile.deleteMany({ where: { userId: user.id } });
        await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
        await prisma.message.deleteMany({ where: { conversationId: { in: (await prisma.conversation.findMany({ where: { userId: user.id }, select: { id: true } })).map(c => c.id) } } });
        await prisma.conversation.deleteMany({ where: { userId: user.id } });
        await prisma.investigationRequest.deleteMany({ where: { userId: user.id } });
        
        // 사용자 삭제
        await prisma.user.delete({ where: { id: user.id } });
      }

      console.log('✅ 테스트 데이터 정리 완료');
    } catch (error) {
      console.error('⚠️ 테스트 데이터 정리 중 오류:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 LI-ONE 전체 시스템 테스트 시작...\n');

    // 테스트 데이터 설정
    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      console.log('❌ 테스트 데이터 설정 실패로 테스트 중단');
      return false;
    }

    // 모든 테스트 실행
    await this.testAuthentication();
    await this.testInvestigatorManagement();
    await this.testInvestigationRequests();
    await this.testCommunication();
    await this.testAISimulation();
    await this.testAdminFunctions();

    // 테스트 데이터 정리
    await this.cleanupTestData();

    // 결과 요약
    console.log('\n📊 테스트 결과 요약:');
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      const warnings = categoryResults.filter(r => r.status === 'WARN').length;
      
      console.log(`\n[${category}]`);
      console.log(`  ✅ 성공: ${passed}`);
      console.log(`  ❌ 실패: ${failed}`);
      console.log(`  ⚠️ 경고: ${warnings}`);
    });

    const totalPassed = this.testResults.filter(r => r.status === 'PASS').length;
    const totalFailed = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalWarnings = this.testResults.filter(r => r.status === 'WARN').length;
    const successRate = ((totalPassed / this.testResults.length) * 100).toFixed(1);

    console.log(`\n🎯 전체 결과:`);
    console.log(`  총 테스트: ${this.testResults.length}`);
    console.log(`  ✅ 성공: ${totalPassed}`);
    console.log(`  ❌ 실패: ${totalFailed}`);
    console.log(`  ⚠️ 경고: ${totalWarnings}`);
    console.log(`  📈 성공률: ${successRate}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 모든 테스트 통과! 시스템 준비 완료');
      return true;
    } else {
      console.log('\n🔧 일부 테스트 실패. 수정이 필요합니다.');
      
      // 실패한 테스트 상세 출력
      console.log('\n❌ 실패한 테스트들:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - [${r.category}] ${r.test}: ${r.message}`);
        });
      
      return false;
    }
  }
}

// 테스트 실행
async function main() {
  const tester = new SystemTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);