import { NextRequest } from 'next/server';
import { POST as registerHandler } from '../src/app/api/register/route';

async function registerCustomer(email: string) {
  const body = {
    role: 'USER',
    email,
    password: 'TestPassword!234',
    name: '테스트 고객',
    displayName: '테스트 고객',
    phone: '01012341234',
    acceptsTerms: true,
    acceptsPrivacy: true,
  };

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

const email = `customer+${Date.now()}@example.com`;
registerCustomer(email)
  .then(() => {
    console.log('Registered new customer:', email);
  })
  .catch((error) => {
    console.error('Customer registration failed:', error);
    process.exit(1);
  });
