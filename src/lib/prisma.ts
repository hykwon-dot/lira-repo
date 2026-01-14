import { PrismaClient } from '@prisma/client';
import { ensureRuntimeDatabaseUrl } from './runtime-secrets';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaClientPromise: Promise<PrismaClient> | undefined;
}

// Singleton pattern for Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export async function getPrismaClient(): Promise<PrismaClient> {
  if (!globalForPrisma.prisma) {
    await ensureRuntimeDatabaseUrl();
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.prisma;
}