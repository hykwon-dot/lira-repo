import { PrismaClient } from '@prisma/client';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaClientPromise: Promise<PrismaClient> | undefined;
  // eslint-disable-next-line no-var
  var prismaDatabaseUrlPromise: Promise<string> | undefined;
}

const FALLBACK_DATABASE_ENV_KEYS = ['LIRA_DATABASE_URL', 'RDS_DATABASE_URL', 'DB_URL'];

async function resolveDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim()) {
    return process.env.DATABASE_URL;
  }

  for (const key of FALLBACK_DATABASE_ENV_KEYS) {
    const candidate = process.env[key];
    if (candidate && candidate.trim()) {
      process.env.DATABASE_URL = candidate.trim();
      return process.env.DATABASE_URL;
    }
  }

  if (!process.env.SSM_DATABASE_URL_PARAMETER) {
    throw new Error(
      'DATABASE_URL 환경 변수를 찾을 수 없습니다. Amplify 콘솔에서 DATABASE_URL 또는 SSM_DATABASE_URL_PARAMETER를 설정하세요.',
    );
  }

  if (!global.prismaDatabaseUrlPromise) {
    global.prismaDatabaseUrlPromise = (async () => {
      const ssmClient = new SSMClient({});
      const command = new GetParameterCommand({
        Name: process.env.SSM_DATABASE_URL_PARAMETER!,
        WithDecryption: true,
      });
      const response = await ssmClient.send(command);
      const value = response.Parameter?.Value?.trim();
      if (!value) {
        throw new Error(`SSM Parameter ${process.env.SSM_DATABASE_URL_PARAMETER} 에 값이 없습니다.`);
      }
      process.env.DATABASE_URL = value;
      return value;
    })();
  }

  return global.prismaDatabaseUrlPromise;
}

async function createPrismaClient(): Promise<PrismaClient> {
  await resolveDatabaseUrl();

  const client =
    global.prisma ||
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

  if (process.env.NODE_ENV !== 'production') {
    global.prisma = client;
  }

  return client;
}

export function getPrismaClient(): Promise<PrismaClient> {
  if (!global.prismaClientPromise) {
    global.prismaClientPromise = createPrismaClient().catch((error) => {
      console.error('Failed to create Prisma client:', error);
      // 에러 발생 시 전역 캐시 초기화
      global.prismaClientPromise = undefined;
      global.prismaDatabaseUrlPromise = undefined;
      throw error;
    });
  }
  return global.prismaClientPromise;
}
