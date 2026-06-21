import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const { featuredOrder } = await req.json(); // 1~9 or null

  try {
    const prisma = await getPrismaClient();

    // 1. 만약 특정 순번(1~9)으로 설정하려는 경우, 해당 번호를 이미 가진 다른 유저가 있는지 확인
    if (featuredOrder !== null) {
      if (featuredOrder < 1 || featuredOrder > 9) {
        return NextResponse.json({ error: '순번은 1에서 9 사이여야 합니다.' }, { status: 400 });
      }

      const existing = await prisma.investigatorProfile.findFirst({
        where: { featuredOrder, id: { not: id } }
      });

      // 이미 해당 순번에 다른 조사원이 있다면 기존 조사원의 순번을 해제(null)
      if (existing) {
        await prisma.investigatorProfile.update({
          where: { id: existing.id },
          data: { featuredOrder: null }
        });
      }
    }

    // 2. 현재 조사원의 순번 업데이트
    const updated = await prisma.investigatorProfile.update({
      where: { id },
      data: { featuredOrder },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json({ 
      message: featuredOrder ? `${featuredOrder}순위로 설정되었습니다.` : '상단 노출이 해제되었습니다.',
      investigator: updated 
    });

  } catch (error) {
    console.error('[Featured Order API Error]', error);
    return NextResponse.json({ error: '순번 설정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
