import { PrismaClient } from '@prisma/client';
import { ensureRuntimeDatabaseUrl } from './runtime-secrets';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaClientPromise: Promise<PrismaClient> | undefined;
}

// 폴백 DATABASE_URL
const FALLBACK_DATABASE_URL = 'mysql://lira_user:asdasd11@lira-db.cluster-ctkse40gyfit.ap-northeast-2.rds.amazonaws.com:3306/lira?ssl={"rejectUnauthorized":false}';

let prisma: PrismaClient | undefined;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (!prisma) {
    await ensureRuntimeDatabaseUrl();
    const databaseUrl = process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL;
    if (!process.env.DATABASE_URL) {
      process.env.DATABASE_URL = databaseUrl;
    }
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}