// 로컬 API 테스트 스크립트
const http = require('http');

function testLocalAPI(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing local APIs...\n');

  try {
    // 1. 테스트 DB API
    console.log('1. Testing /api/test-db');
    const dbTest = await testLocalAPI('/api/test-db');
    console.log(`   Status: ${dbTest.status}`);
    console.log(`   Success: ${dbTest.data.success || false}`);
    if (dbTest.data.error) {
      console.log(`   Error: ${dbTest.data.error}`);
    }
    console.log();

    // 2. 조사원 목록 API
    console.log('2. Testing /api/investigators');
    const investigators = await testLocalAPI('/api/investigators?status=APPROVED');
    console.log(`   Status: ${investigators.status}`);
    if (investigators.data.investigators) {
      console.log(`   Investigators found: ${investigators.data.investigators.length}`);
    }
    if (investigators.data.error) {
      console.log(`   Error: ${investigators.data.error}`);
    }
    console.log();

    // 3. 회원가입 API (테스트 데이터)
    console.log('3. Testing /api/register (dry run)');
    const registerData = {
      role: 'USER',
      email: 'test-' + Date.now() + '@example.com',
      password: 'testpassword123',
      name: 'Test User',
      acceptsTerms: true,
      acceptsPrivacy: true
    };
    
    const register = await testLocalAPI('/api/register', 'POST', registerData);
    console.log(`   Status: ${register.status}`);
    if (register.data.error) {
      console.log(`   Error: ${register.data.error}`);
    } else {
      console.log(`   Success: User created with ID ${register.data.id || 'unknown'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure to start the development server first:');
    console.log('   npm run dev');
  }
}

runTests();