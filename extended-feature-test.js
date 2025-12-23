const { getPrismaClient } = require('./src/lib/prisma.ts');
const { hashPassword } = require('./src/lib/hash.ts');

class ExtendedFeatureTester {
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
    try {
      const prisma = await getPrismaClient();
      
      // 기본 테스트 사용자들 생성
      const users = [
        { role: 'USER', email: `ext-user-${Date.now()}@example.com`, name: '확장 테스트 고객' },
        { role: 'INVESTIGATOR', email: `ext-investigator-${Date.now()}@example.com`, name: '확장 테스트 탐정' },
        { role: 'ADMIN', email: `ext-admin-${Date.now()}@example.com`, name: '확장 테스트 관리자' }
      ];

      for (const userData of users) {
        const hashedPwd = await hashPassword('TestPassword123!');
        const user = await prisma.user.create({
          data: { ...userData, password: hashedPwd }
        });
        this.testUsers[userData.role] = user;

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

      return true;
    } catch (error) {
      console.error('테스트 데이터 설정 실패:', error);
      return false;
    }
  }

  async testInvestigatorChatSystem() {
    console.log('💬 탐정-고객 채팅 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 조사 의뢰 생성
      const scenario = await prisma.scenario.findFirst();
      const investigationRequest = await prisma.investigationRequest.create({
        data: {
          userId: this.testUsers.USER.id,
          scenarioId: scenario.id,
          title: '채팅 테스트 의뢰',
          details: '채팅 시스템 테스트용 의뢰입니다.',
          status: 'MATCHING'
        }
      });

      // 2. 탐정 배정
      await prisma.investigationRequest.update({
        where: { id: investigationRequest.id },
        data: { 
          investigatorId: this.testData.investigatorProfile.id,
          acceptedAt: new Date()
        }
      });

      // 3. 채팅방 생성
      const chatRoom = await prisma.investigationChatRoom.create({
        data: {
          requestId: investigationRequest.id,
          customerId: this.testUsers.USER.id,
          investigatorUserId: this.testUsers.INVESTIGATOR.id
        }
      });

      this.log('CHAT', '채팅방 생성', 'PASS', '탐정-고객 채팅방 생성 성공');

      // 4. 고객 메시지 전송
      const customerMessage = await prisma.investigationChatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: this.testUsers.USER.id,
          content: '안녕하세요, 조사 진행 상황이 궁금합니다.',
          requestStage: 'IN_PROGRESS'
        }
      });

      this.log('CHAT', '고객 메시지', 'PASS', '고객 메시지 전송 성공');

      // 5. 탐정 응답
      const investigatorMessage = await prisma.investigationChatMessage.create({
        data: {
          roomId: chatRoom.id,
          senderId: this.testUsers.INVESTIGATOR.id,
          content: '현재 초기 조사를 진행 중입니다. 내일 중간 보고서를 전달드리겠습니다.',
          requestStage: 'IN_PROGRESS'
        }
      });

      this.log('CHAT', '탐정 응답', 'PASS', '탐정 응답 메시지 전송 성공');

      // 6. 채팅 내역 조회
      const messages = await prisma.investigationChatMessage.findMany({
        where: { roomId: chatRoom.id },
        include: { sender: true },
        orderBy: { createdAt: 'asc' }
      });

      if (messages.length === 2) {
        this.log('CHAT', '채팅 내역', 'PASS', '채팅 내역 조회 성공');
      } else {
        this.log('CHAT', '채팅 내역', 'FAIL', '채팅 메시지 수 불일치');
      }

      this.testData.chatRoom = chatRoom;
      this.testData.investigationRequest = investigationRequest;

    } catch (error) {
      this.log('CHAT', '채팅 시스템', 'FAIL', '채팅 시스템 테스트 실패', error.message);
    }
  }

  async testTimelineSystem() {
    console.log('📅 조사 타임라인 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      if (!this.testData.investigationRequest) {
        this.log('TIMELINE', '타임라인', 'FAIL', '테스트용 조사 의뢰가 없음');
        return;
      }

      // 1. 의뢰 생성 타임라인
      const requestCreated = await prisma.investigationTimelineEntry.create({
        data: {
          requestId: this.testData.investigationRequest.id,
          type: 'REQUEST_CREATED',
          title: '조사 의뢰 접수',
          note: '고객으로부터 조사 의뢰가 접수되었습니다.',
          authorId: this.testUsers.USER.id
        }
      });

      this.log('TIMELINE', '의뢰 생성', 'PASS', '의뢰 생성 타임라인 추가 성공');

      // 2. 탐정 배정 타임라인
      const investigatorAssigned = await prisma.investigationTimelineEntry.create({
        data: {
          requestId: this.testData.investigationRequest.id,
          type: 'INVESTIGATOR_ASSIGNED',
          title: '탐정 배정 완료',
          note: '전문 탐정이 배정되었습니다.',
          authorId: this.testUsers.ADMIN.id
        }
      });

      this.log('TIMELINE', '탐정 배정', 'PASS', '탐정 배정 타임라인 추가 성공');

      // 3. 진행 상황 보고
      const progressNote = await prisma.investigationTimelineEntry.create({
        data: {
          requestId: this.testData.investigationRequest.id,
          type: 'PROGRESS_NOTE',
          title: '중간 보고',
          note: '초기 조사를 완료하였으며, 추가 증거 수집을 진행 중입니다.',
          authorId: this.testUsers.INVESTIGATOR.id
        }
      });

      this.log('TIMELINE', '진행 보고', 'PASS', '진행 상황 보고 타임라인 추가 성공');

      // 4. 타임라인 조회
      const timeline = await prisma.investigationTimelineEntry.findMany({
        where: { requestId: this.testData.investigationRequest.id },
        include: { author: true },
        orderBy: { createdAt: 'asc' }
      });

      if (timeline.length === 3) {
        this.log('TIMELINE', '타임라인 조회', 'PASS', '타임라인 조회 성공');
      } else {
        this.log('TIMELINE', '타임라인 조회', 'FAIL', '타임라인 항목 수 불일치');
      }

    } catch (error) {
      this.log('TIMELINE', '타임라인 시스템', 'FAIL', '타임라인 시스템 테스트 실패', error.message);
    }
  }

  async testMatchingSystem() {
    console.log('🎯 탐정 매칭 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 새로운 조사 의뢰 생성
      const scenario = await prisma.scenario.findFirst();
      const newRequest = await prisma.investigationRequest.create({
        data: {
          userId: this.testUsers.USER.id,
          scenarioId: scenario.id,
          title: '매칭 테스트 의뢰',
          details: '탐정 매칭 시스템 테스트용 의뢰입니다.',
          budgetMin: 2000000,
          budgetMax: 4000000,
          status: 'MATCHING'
        }
      });

      this.log('MATCHING', '의뢰 생성', 'PASS', '매칭용 의뢰 생성 성공');

      // 2. 탐정 매칭 점수 계산 및 저장
      const match = await prisma.investigatorMatch.create({
        data: {
          requestId: newRequest.id,
          investigatorId: this.testData.investigatorProfile.id,
          score: 85.5,
          reason: '전문분야 일치, 경력 적합, 지역 근접'
        }
      });

      this.log('MATCHING', '매칭 점수', 'PASS', '탐정 매칭 점수 계산 및 저장 성공');

      // 3. 매칭 결과 조회
      const matches = await prisma.investigatorMatch.findMany({
        where: { requestId: newRequest.id },
        include: { investigator: { include: { user: true } } },
        orderBy: { score: 'desc' }
      });

      if (matches.length > 0 && matches[0].score >= 80) {
        this.log('MATCHING', '매칭 결과', 'PASS', '고점수 매칭 결과 조회 성공');
      } else {
        this.log('MATCHING', '매칭 결과', 'FAIL', '매칭 결과 조회 실패');
      }

      // 4. 탐정 수임
      await prisma.investigationRequest.update({
        where: { id: newRequest.id },
        data: { 
          investigatorId: this.testData.investigatorProfile.id,
          acceptedAt: new Date()
        }
      });

      this.log('MATCHING', '탐정 수임', 'PASS', '탐정 수임 처리 성공');

    } catch (error) {
      this.log('MATCHING', '매칭 시스템', 'FAIL', '매칭 시스템 테스트 실패', error.message);
    }
  }

  async testReviewSystem() {
    console.log('⭐ 탐정 리뷰 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      if (!this.testData.investigationRequest) {
        this.log('REVIEW', '리뷰 시스템', 'FAIL', '테스트용 조사 의뢰가 없음');
        return;
      }

      // 1. 조사 완료 처리
      await prisma.investigationRequest.update({
        where: { id: this.testData.investigationRequest.id },
        data: { completedAt: new Date() }
      });

      // 2. 고객 리뷰 작성
      const review = await prisma.investigatorReview.create({
        data: {
          requestId: this.testData.investigationRequest.id,
          investigatorId: this.testData.investigatorProfile.id,
          customerId: this.testUsers.USER.id,
          rating: 5,
          comment: '매우 만족스러운 조사 결과였습니다. 전문적이고 신속한 처리에 감사드립니다.'
        }
      });

      this.log('REVIEW', '리뷰 작성', 'PASS', '고객 리뷰 작성 성공');

      // 3. 탐정 평점 업데이트
      const reviews = await prisma.investigatorReview.findMany({
        where: { investigatorId: this.testData.investigatorProfile.id }
      });

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      
      await prisma.investigatorProfile.update({
        where: { id: this.testData.investigatorProfile.id },
        data: { ratingAverage: avgRating }
      });

      this.log('REVIEW', '평점 업데이트', 'PASS', '탐정 평점 업데이트 성공');

      // 4. 리뷰 조회
      const investigatorReviews = await prisma.investigatorReview.findMany({
        where: { investigatorId: this.testData.investigatorProfile.id },
        include: { customer: true }
      });

      if (investigatorReviews.length > 0) {
        this.log('REVIEW', '리뷰 조회', 'PASS', '탐정 리뷰 조회 성공');
      } else {
        this.log('REVIEW', '리뷰 조회', 'FAIL', '리뷰 조회 실패');
      }

    } catch (error) {
      this.log('REVIEW', '리뷰 시스템', 'FAIL', '리뷰 시스템 테스트 실패', error.message);
    }
  }

  async testNotificationSystem() {
    console.log('🔔 알림 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 조사 배정 알림
      const assignmentNotification = await prisma.notification.create({
        data: {
          userId: this.testUsers.INVESTIGATOR.id,
          type: 'INVESTIGATION_ASSIGNED',
          title: '새로운 조사 의뢰 배정',
          message: '새로운 조사 의뢰가 배정되었습니다. 확인해주세요.',
          actionUrl: '/investigation-requests/1'
        }
      });

      this.log('NOTIFICATION', '배정 알림', 'PASS', '조사 배정 알림 생성 성공');

      // 2. 채팅 메시지 알림
      const chatNotification = await prisma.notification.create({
        data: {
          userId: this.testUsers.USER.id,
          type: 'CHAT_MESSAGE',
          title: '새로운 메시지',
          message: '탐정으로부터 새로운 메시지가 도착했습니다.',
          actionUrl: '/investigation-requests/1/chat'
        }
      });

      this.log('NOTIFICATION', '채팅 알림', 'PASS', '채팅 메시지 알림 생성 성공');

      // 3. 알림 조회
      const notifications = await prisma.notification.findMany({
        where: { userId: this.testUsers.USER.id },
        orderBy: { createdAt: 'desc' }
      });

      if (notifications.length > 0) {
        this.log('NOTIFICATION', '알림 조회', 'PASS', '사용자 알림 조회 성공');
      } else {
        this.log('NOTIFICATION', '알림 조회', 'FAIL', '알림 조회 실패');
      }

      // 4. 알림 읽음 처리
      await prisma.notification.update({
        where: { id: chatNotification.id },
        data: { readAt: new Date() }
      });

      this.log('NOTIFICATION', '읽음 처리', 'PASS', '알림 읽음 처리 성공');

    } catch (error) {
      this.log('NOTIFICATION', '알림 시스템', 'FAIL', '알림 시스템 테스트 실패', error.message);
    }
  }

  async testSimulationSystem() {
    console.log('🎮 시뮬레이션 시스템 테스트...\n');

    try {
      const prisma = await getPrismaClient();

      // 1. 시뮬레이션 실행 시작
      const scenario = await prisma.scenario.findFirst();
      const simulationRun = await prisma.simulationRun.create({
        data: {
          userId: this.testUsers.USER.id,
          scenarioId: scenario.id,
          status: 'ACTIVE',
          metadata: { difficulty: 'MEDIUM', userPreferences: ['DETAILED_ANALYSIS'] }
        }
      });

      this.log('SIMULATION', '시뮬레이션 시작', 'PASS', '시뮬레이션 실행 시작 성공');

      // 2. 시뮬레이션 이벤트 기록
      const phaseEvent = await prisma.simulationEvent.create({
        data: {
          runId: simulationRun.id,
          userId: this.testUsers.USER.id,
          eventType: 'PHASE_ENTERED',
          payload: { phaseId: 1, phaseName: '초기 조사', timestamp: new Date() }
        }
      });

      this.log('SIMULATION', '이벤트 기록', 'PASS', '시뮬레이션 이벤트 기록 성공');

      // 3. 시뮬레이션 완료
      await prisma.simulationRun.update({
        where: { id: simulationRun.id },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      this.log('SIMULATION', '시뮬레이션 완료', 'PASS', '시뮬레이션 완료 처리 성공');

      // 4. 시뮬레이션 기록 조회
      const userSimulations = await prisma.simulationRun.findMany({
        where: { userId: this.testUsers.USER.id },
        include: { scenario: true, events: true }
      });

      if (userSimulations.length > 0) {
        this.log('SIMULATION', '기록 조회', 'PASS', '사용자 시뮬레이션 기록 조회 성공');
      } else {
        this.log('SIMULATION', '기록 조회', 'FAIL', '시뮬레이션 기록 조회 실패');
      }

    } catch (error) {
      this.log('SIMULATION', '시뮬레이션 시스템', 'FAIL', '시뮬레이션 시스템 테스트 실패', error.message);
    }
  }

  async cleanupTestData() {
    try {
      const prisma = await getPrismaClient();

      for (const user of Object.values(this.testUsers)) {
        // 관련 데이터 삭제
        await prisma.investigatorReview.deleteMany({ where: { customerId: user.id } });
        await prisma.investigatorReview.deleteMany({ where: { investigatorId: this.testData.investigatorProfile?.id } });
        await prisma.investigationTimelineEntry.deleteMany({ where: { authorId: user.id } });
        await prisma.investigationChatMessage.deleteMany({ where: { senderId: user.id } });
        await prisma.investigationChatRoom.deleteMany({ where: { customerId: user.id } });
        await prisma.investigationChatRoom.deleteMany({ where: { investigatorUserId: user.id } });
        await prisma.investigatorMatch.deleteMany({ where: { investigatorId: this.testData.investigatorProfile?.id } });
        await prisma.simulationEvent.deleteMany({ where: { userId: user.id } });
        await prisma.simulationRun.deleteMany({ where: { userId: user.id } });
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.investigationRequest.deleteMany({ where: { userId: user.id } });
        await prisma.investigatorProfile.deleteMany({ where: { userId: user.id } });
        await prisma.customerProfile.deleteMany({ where: { userId: user.id } });
        
        // 사용자 삭제
        await prisma.user.delete({ where: { id: user.id } });
      }

      console.log('✅ 확장 테스트 데이터 정리 완료');
    } catch (error) {
      console.error('⚠️ 확장 테스트 데이터 정리 중 오류:', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 LI-ONE 확장 기능 테스트 시작...\n');

    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      console.log('❌ 테스트 데이터 설정 실패로 테스트 중단');
      return false;
    }

    // 모든 확장 기능 테스트 실행
    await this.testInvestigatorChatSystem();
    await this.testTimelineSystem();
    await this.testMatchingSystem();
    await this.testReviewSystem();
    await this.testNotificationSystem();
    await this.testSimulationSystem();

    // 테스트 데이터 정리
    await this.cleanupTestData();

    // 결과 요약
    console.log('\n📊 확장 기능 테스트 결과:');
    const categories = [...new Set(this.testResults.map(r => r.category))];
    
    categories.forEach(category => {
      const categoryResults = this.testResults.filter(r => r.category === category);
      const passed = categoryResults.filter(r => r.status === 'PASS').length;
      const failed = categoryResults.filter(r => r.status === 'FAIL').length;
      
      console.log(`\n[${category}]`);
      console.log(`  ✅ 성공: ${passed}`);
      console.log(`  ❌ 실패: ${failed}`);
    });

    const totalPassed = this.testResults.filter(r => r.status === 'PASS').length;
    const totalFailed = this.testResults.filter(r => r.status === 'FAIL').length;
    const successRate = ((totalPassed / this.testResults.length) * 100).toFixed(1);

    console.log(`\n🎯 확장 기능 전체 결과:`);
    console.log(`  총 테스트: ${this.testResults.length}`);
    console.log(`  ✅ 성공: ${totalPassed}`);
    console.log(`  ❌ 실패: ${totalFailed}`);
    console.log(`  📈 성공률: ${successRate}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 모든 확장 기능 테스트 통과!');
      return true;
    } else {
      console.log('\n🔧 일부 확장 기능 테스트 실패.');
      return false;
    }
  }
}

// 테스트 실행
async function main() {
  const tester = new ExtendedFeatureTester();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);