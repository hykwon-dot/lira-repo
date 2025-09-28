import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaClientPromise: Promise<PrismaClient> | undefined;
}

// 폴백 DATABASE_URL
const FALLBACK_DATABASE_URL = 'mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={"rejectUnauthorized":false}';

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || FALLBACK_DATABASE_URL;
}

async function createPrismaClient(): Promise<PrismaClient> {
  const databaseUrl = getDatabaseUrl();
  
  // 환경 변수가 없으면 설정
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = databaseUrl;
  }

  const client = global.prisma || new PrismaClient({
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
      global.prismaClientPromise = undefined;
      throw error;
    });
  }
  
  return global.prismaClientPromise;
}