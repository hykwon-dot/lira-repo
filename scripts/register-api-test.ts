import { NextRequest } from 'next/server';
import { POST as registerHandler } from '../src/app/api/register/route';

function buildRequestBody() {
  const timestamp = Date.now();
  return {
    email: `investigator+${timestamp}@example.com`,
    password: 'TestPassword!234',
    name: '테스트 탐정',
    role: 'INVESTIGATOR',
    specialties: ['FIELD_TAIL', 'UNDERCOVER'],
    licenseNumber: null,
    experienceYears: 3,
    serviceArea: '서울 전역',
    introduction: '테스트 용도로 생성된 프로필입니다.',
    portfolioUrl: 'https://example.com/portfolio',
    contactPhone: '01012345678',
    acceptsTerms: true,
    acceptsPrivacy: true,
  };
}

async function run() {
  const body = buildRequestBody();
  const request = new NextRequest('http://localhost/api/register', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  });

  const response = await registerHandler(request);
  const result = await response.json();

  console.log('HTTP Status:', response.status);
  console.dir(result, { depth: null });

  if (response.status >= 400) {
    throw new Error(`Registration failed with status ${response.status}`);
  }
}

run().catch((error) => {
  console.error('Register API test failed:', error);
  process.exit(1);
});
