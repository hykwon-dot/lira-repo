import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';


export async function GET(req: NextRequest) {
  console.log('[API] GET /api/investigators - Request received');
  
  try {

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API] Query params:', { status, limit, offset });

    console.log('[API] Getting Prisma client...');
    const prisma = await getPrismaClient();
    console.log('[API] Prisma client obtained successfully');
    
    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {};
    console.log('[API] Where clause:', where);
    
    console.log('[API] Executing database queries...');
    const [investigators, total] = await Promise.all([
      prisma.investigatorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.investigatorProfile.count({ where }),
    ]);

    console.log('[API] Query results:', { investigatorCount: investigators.length, total });

    const response = {
      investigators,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };

    console.log('[API] Sending successful response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Failed to fetch investigators:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: '조사원 목록을 불러오는데 실패했습니다.',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : String(error) : undefined
      },
      { status: 500 }
    );
  }
}