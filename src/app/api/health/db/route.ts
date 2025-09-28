import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function GET() {
  const start = Date.now();
  try {
    const prisma = await getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', latencyMs: Date.now() - start });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ status: 'fail', error: message }, { status: 500 });
  }
}
