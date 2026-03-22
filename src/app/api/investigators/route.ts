import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const prisma = await getPrismaClient();

    // 1. 상단 고정(Featured) 조사원 조회 (최대 9명, 순번순)
    const featuredInvestigators = await prisma.investigatorProfile.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        featuredOrder: { not: null }
      },
      orderBy: { featuredOrder: 'asc' },
      take: 9,
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true }
        }
      }
    });

    // 2. 일반 조사원 조회 (랜덤 셔플)
    // MariaDB/MySQL의 RAND() 함수를 사용하기 위해 raw 쿼리를 사용하거나, 
    // 전체 데이터를 가져와 섞습니다. 여기서는 성능을 위해 raw 쿼리 방식을 활용합니다.
    
    // Featured 아이디 제외 목록
    const featuredIds = featuredInvestigators.map(inv => inv.id);
    
    // 일반 조사원 무작위 조회 (MariaDB 기준 RAND())
    const otherInvestigatorsRaw: any[] = await prisma.$queryRawUnsafe(`
      SELECT ip.id FROM InvestigatorProfile ip
      WHERE ip.status = 'APPROVED' 
      AND ip.deletedAt IS NULL 
      ${featuredIds.length > 0 ? `AND ip.id NOT IN (${featuredIds.join(',')})` : ''}
      ORDER BY RAND()
      LIMIT ${limit}
    `);

    const otherIds = otherInvestigatorsRaw.map(row => row.id);

    // 상세 데이터 조회 (Prisma 타입 안정성 확보)
    const otherInvestigators = await prisma.investigatorProfile.findMany({
      where: { id: { in: otherIds } },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true }
        }
      }
    });

    // queryRaw 결과의 순서(랜덤)를 유지하기 위해 다시 정렬
    const shuffledOthers = otherIds.map(id => otherInvestigators.find(inv => inv.id === id)).filter(Boolean);

    // 3. 데이터 병합 및 페이지네이션 처리
    // 첫 페이지인 경우에만 상단 고정 멤버를 앞에 붙임
    let combined = [];
    if (offset === 0) {
      combined = [...featuredInvestigators, ...shuffledOthers];
    } else {
      combined = shuffledOthers;
    }

    // 최종 응답용 가공 (Decimal -> Number 변환 등)
    const formatted = combined.map((inv: any) => ({
      ...inv,
      ratingAverage: inv.ratingAverage ? Number(inv.ratingAverage) : null,
      successRate: inv.successRate ? Number(inv.successRate) : null,
    }));

    const total = await prisma.investigatorProfile.count({
      where: { status: 'APPROVED', deletedAt: null }
    });

    return NextResponse.json({
      investigators: formatted.slice(0, limit),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });

  } catch (error) {
    console.error('[API] Failed to fetch investigators:', error);
    return NextResponse.json(
      { error: '조사원 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}