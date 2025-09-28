const { NextRequest } = require('next/server');

// 회원가입 API 테스트
async function testRegisterAPI() {
  try {
    console.log('Testing register API...');
    
    // 테스트 데이터
    const testPayload = {
      role: 'USER',
      email: 'test@example.com',
      password: 'testpassword123',
      name: 'Test User',
      acceptsTerms: true,
      acceptsPrivacy: true
    };

    // API 함수 직접 import 및 호출
    const { POST } = require('./src/app/api/register/route.ts');
    
    // Mock NextRequest 생성
    const mockRequest = {
      json: async () => testPayload,
      url: 'http://localhost:3000/api/register'
    };

    console.log('Calling POST function...');
    const response = await POST(mockRequest);
    
    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
  } catch (error) {
    console.error('❌ Register API test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRegisterAPI();