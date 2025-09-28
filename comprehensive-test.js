const http = require('http');

class LIRATestSuite {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = [];
    this.testData = {
      userEmail: `test-user-${Date.now()}@example.com`,
      investigatorEmail: `test-investigator-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      userToken: null,
      investigatorToken: null
    };
  }

  async request(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ status: res.statusCode, data: parsed, raw: responseData });
          } catch {
            resolve({ status: res.statusCode, data: responseData, raw: responseData });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  log(test, status, message, details = null) {
    const result = { test, status, message, details, timestamp: new Date().toISOString() };
    this.results.push(result);
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${test}: ${message}`);
    if (details) console.log(`   Details: ${JSON.stringify(details)}`);
  }

  async test1_DatabaseConnection() {
    try {
      const res = await this.request('/api/test-db');
      if (res.status === 200 && res.data.success) {
        this.log('DB연결', 'PASS', '데이터베이스 연결 성공', res.data.data);
      } else {
        this.log('DB연결', 'FAIL', '데이터베이스 연결 실패', res.data);
      }
    } catch (error) {
      this.log('DB연결', 'FAIL', '데이터베이스 연결 오류', error.message);
    }
  }

  async test2_UserRegistration() {
    try {
      const userData = {
        role: 'USER',
        email: this.testData.userEmail,
        password: this.testData.password,
        name: '테스트 사용자',
        acceptsTerms: true,
        acceptsPrivacy: true
      };

      const res = await this.request('/api/register', 'POST', userData);
      if (res.status === 201 && res.data.token) {
        this.testData.userToken = res.data.token;
        this.log('사용자가입', 'PASS', '사용자 회원가입 성공', { id: res.data.id });
      } else {
        this.log('사용자가입', 'FAIL', '사용자 회원가입 실패', res.data);
      }
    } catch (error) {
      this.log('사용자가입', 'FAIL', '사용자 회원가입 오류', error.message);
    }
  }

  async test3_InvestigatorRegistration() {
    try {
      const investigatorData = {
        role: 'INVESTIGATOR',
        email: this.testData.investigatorEmail,
        password: this.testData.password,
        name: '테스트 탐정',
        specialties: ['FIELD_TAIL', 'UNDERCOVER'],
        experienceYears: 5,
        contactPhone: '01012345678',
        acceptsTerms: true,
        acceptsPrivacy: true
      };

      const res = await this.request('/api/register', 'POST', investigatorData);
      if (res.status === 201 && res.data.investigator) {
        this.log('탐정가입', 'PASS', '탐정 회원가입 성공', { 
          id: res.data.id, 
          status: res.data.investigatorStatus 
        });
      } else {
        this.log('탐정가입', 'FAIL', '탐정 회원가입 실패', res.data);
      }
    } catch (error) {
      this.log('탐정가입', 'FAIL', '탐정 회원가입 오류', error.message);
    }
  }

  async test4_UserLogin() {
    try {
      const loginData = {
        email: this.testData.userEmail,
        password: this.testData.password
      };

      const res = await this.request('/api/login', 'POST', loginData);
      if (res.status === 200 && res.data.token) {
        this.testData.userToken = res.data.token;
        this.log('사용자로그인', 'PASS', '사용자 로그인 성공', { role: res.data.user.role });
      } else {
        this.log('사용자로그인', 'FAIL', '사용자 로그인 실패', res.data);
      }
    } catch (error) {
      this.log('사용자로그인', 'FAIL', '사용자 로그인 오류', error.message);
    }
  }

  async test5_InvestigatorLogin() {
    try {
      const loginData = {
        email: this.testData.investigatorEmail,
        password: this.testData.password
      };

      const res = await this.request('/api/login', 'POST', loginData);
      if (res.status === 200 || res.status === 403) {
        if (res.status === 403 && res.data.code === 'INVESTIGATOR_PENDING') {
          this.log('탐정로그인', 'PASS', '탐정 승인 대기 상태 확인됨', res.data);
        } else if (res.status === 200) {
          this.testData.investigatorToken = res.data.token;
          this.log('탐정로그인', 'PASS', '탐정 로그인 성공', { role: res.data.user.role });
        }
      } else {
        this.log('탐정로그인', 'FAIL', '탐정 로그인 실패', res.data);
      }
    } catch (error) {
      this.log('탐정로그인', 'FAIL', '탐정 로그인 오류', error.message);
    }
  }

  async test6_InvestigatorsList() {
    try {
      const res = await this.request('/api/investigators?status=APPROVED');
      if (res.status === 200 && res.data.investigators) {
        this.log('탐정목록', 'PASS', `탐정 목록 조회 성공 (${res.data.investigators.length}명)`, {
          total: res.data.pagination.total
        });
      } else {
        this.log('탐정목록', 'FAIL', '탐정 목록 조회 실패', res.data);
      }
    } catch (error) {
      this.log('탐정목록', 'FAIL', '탐정 목록 조회 오류', error.message);
    }
  }

  async test7_ChatGPTAPI() {
    try {
      const chatData = {
        messages: [
          { role: 'user', content: '안녕하세요, 테스트 메시지입니다.' }
        ]
      };

      const res = await this.request('/api/chat-gpt', 'POST', chatData);
      if (res.status === 200) {
        this.log('ChatGPT', 'PASS', 'ChatGPT API 연결 성공');
      } else {
        this.log('ChatGPT', 'FAIL', 'ChatGPT API 연결 실패', res.data);
      }
    } catch (error) {
      this.log('ChatGPT', 'FAIL', 'ChatGPT API 오류', error.message);
    }
  }

  async test8_ScenariosAPI() {
    try {
      const res = await this.request('/api/scenarios');
      if (res.status === 200 && Array.isArray(res.data)) {
        this.log('시나리오', 'PASS', `시나리오 목록 조회 성공 (${res.data.length}개)`);
      } else {
        this.log('시나리오', 'FAIL', '시나리오 목록 조회 실패', res.data);
      }
    } catch (error) {
      this.log('시나리오', 'FAIL', '시나리오 목록 조회 오류', error.message);
    }
  }

  async runAllTests() {
    console.log('🚀 LIRA 종합 테스트 시작...\n');
    
    await this.test1_DatabaseConnection();
    await this.test2_UserRegistration();
    await this.test3_InvestigatorRegistration();
    await this.test4_UserLogin();
    await this.test5_InvestigatorLogin();
    await this.test6_InvestigatorsList();
    await this.test7_ChatGPTAPI();
    await this.test8_ScenariosAPI();

    console.log('\n📊 테스트 결과 요약:');
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(`✅ 성공: ${passed}`);
    console.log(`❌ 실패: ${failed}`);
    console.log(`⚠️  경고: ${warnings}`);
    console.log(`📈 성공률: ${((passed / this.results.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 모든 테스트 통과! 배포 준비 완료');
      return true;
    } else {
      console.log('\n🔧 실패한 테스트가 있습니다. 수정이 필요합니다.');
      return false;
    }
  }
}

// 테스트 실행
async function main() {
  const tester = new LIRATestSuite();
  const success = await tester.runAllTests();
  process.exit(success ? 0 : 1);
}

main().catch(console.error);