import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * 개별 조사원 상세 정보 조회 API
 * GET /api/investigators/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    
    const investigator = await prisma.investigatorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviews: {
          include: {
            customer: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // 최근 리뷰 5개만 포함
        },
      },
    });

    if (!investigator) {
      return NextResponse.json({ error: 'INVESTIGATOR_NOT_FOUND' }, { status: 404 });
    }

    // Response structure expected by InvestigatorDetailModal
    return NextResponse.json({ investigator });
  } catch (error) {
    console.error('[Individual Investigator API Error]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
