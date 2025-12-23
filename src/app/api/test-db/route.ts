import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[TEST-DB] Starting database test...');
  
  try {
    console.log('[TEST-DB] Environment check:');
    console.log('  NODE_ENV:', process.env.NODE_ENV);
    console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('  DATABASE_URL length:', process.env.DATABASE_URL?.length || 0);
    
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      console.log('  Database host:', url.host);
      console.log('  Database name:', url.pathname.replace('/', ''));
    }
    
    console.log('[TEST-DB] Getting Prisma client...');
    const prisma = await getPrismaClient();
    console.log('[TEST-DB] Prisma client obtained');
    
    console.log('[TEST-DB] Testing simple query...');
    const userCount = await prisma.user.count();
    console.log('[TEST-DB] User count:', userCount);
    
    console.log('[TEST-DB] Testing investigator query...');
    const investigatorCount = await prisma.investigatorProfile.count();
    console.log('[TEST-DB] Investigator count:', investigatorCount);
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        userCount,
        investigatorCount,
        environment: process.env.NODE_ENV,
        databaseHost: process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).host : 'unknown'
      }
    });
    
  } catch (error) {
    console.error('[TEST-DB] Error:', error);
    console.error('[TEST-DB] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    }, { status: 500 });
  }
}