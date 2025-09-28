import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3100';
const timestamp = Date.now();
const CUSTOMER_EMAIL = `customer+${timestamp}@example.com`;
const CUSTOMER_PASSWORD = 'TestPassword!234';

async function loginAsCustomer(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', CUSTOMER_EMAIL);
  await page.fill('input[type="password"]', CUSTOMER_PASSWORD);
  const loginResponsePromise = page.waitForResponse((res) =>
    res.url().includes('/api/login') && res.request().method() === 'POST',
  );
  await page.click('button[type="submit"]');
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();
  await page.waitForURL('**/');
}

test.describe('Investigation request flow', () => {
  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/register`, {
      data: {
        email: CUSTOMER_EMAIL,
        password: CUSTOMER_PASSWORD,
        name: '플레이라이트 고객',
        role: 'USER',
        acceptsTerms: true,
        acceptsPrivacy: true,
        marketingOptIn: false,
      },
    });

    if (response.status() !== 409) {
      expect(response.ok()).toBeTruthy();
    }
  });

  test('account page renders without recursive update errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await loginAsCustomer(page);

    await page.goto(`${BASE_URL}/account`);
    await expect(page.locator('h1:has-text("나의 정보")')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const hasDepthError = consoleMessages.some((message) =>
      message.toLowerCase().includes('maximum update depth exceeded'),
    );
    expect(hasDepthError).toBeFalsy();
  });

  test('customer can submit a request', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });

    await loginAsCustomer(page);

    await page.goto(`${BASE_URL}/investigators`);
    await page.waitForSelector('text=사건 의뢰하기 ↗');
    const requestLinks = await page.$$('text=사건 의뢰하기 ↗');
    if (requestLinks.length === 0) {
      test.skip(true, 'No investigators available to request');
    }
    await requestLinks[0].click();

    await page.waitForURL('**/investigation-requests/new**');

    await page.fill('input[placeholder="예: 제품 유출 의혹 조사"]', '자동화 테스트 사건');
    await page.fill('textarea[placeholder="사건의 배경, 수사 목표, 기대하는 결과 등을 상세히 작성해주세요."]', '자동화 테스트로 생성된 사건 상세입니다.');
    await page.fill('textarea[placeholder="원하는 산출물, 보고서 형태, 대응 일정 등을 작성해주세요."]', '결과 보고서를 기대합니다.');

    const submitButton = await page.waitForSelector('button:has-text("사건 의뢰 보내기")');
    await submitButton.click();

    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(/\/investigation-requests\//);

    if (consoleMessages.length > 0) {
      console.log('Console log during test:');
      for (const message of consoleMessages) {
        console.log(message);
      }
    }
  });
});
