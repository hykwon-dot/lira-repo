import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scenarios/search
 * 대화에서 추출된 키워드를 기반으로 유사한 기업 시나리오를 검색합니다.
 * @param {NextRequest} req - Next.js 요청 객체. `keywords` 쿼리 파라미터 필요 (e.g., "고객,가격,미팅")
 * @returns {NextResponse} 검색된 시나리오 목록 또는 오류 메시지
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keywordsParam = searchParams.get('keywords');

    if (!keywordsParam) {
      return NextResponse.json({ error: '검색을 위한 키워드가 필요합니다.' }, { status: 400 });
    }

    const keywords = keywordsParam.split(',').map(k => k.trim()).filter(k => k);

    if (keywords.length === 0) {
        return NextResponse.json([]);
    }

    // 각 키워드에 대해 제목, 설명에서 검색을 수행합니다.
  const prisma = await getPrismaClient();
  const scenarios = await prisma.scenario.findMany({
      where: {
        OR: keywords.map(keyword => ({
          OR: [
            { title: { contains: keyword } },
            { description: { contains: keyword } },
            // TODO: overview (JSON) 필드에 대한 검색 로직 추가 필요
            // 예: { overview: { path: ['customer', 'situation'], string_contains: keyword } }
          ],
        })),
      },
      take: 5, // 최대 5개의 결과만 반환
    });

    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('시나리오 검색 오류:', error);
    return NextResponse.json({ error: '시나리오 검색에 실패했습니다.' }, { status: 500 });
  }
}
