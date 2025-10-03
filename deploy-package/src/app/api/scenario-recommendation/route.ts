import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import stringSimilarity from 'string-similarity';

export const dynamic = 'force-dynamic';

// 추천 시나리오에 대한 타입 정의
interface ScenarioRec {
  id: number;
  title: string;
  description: string;
  image: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt')?.trim();
    if (!prompt) {
      return NextResponse.json({ error: '검색어가 필요합니다.' }, { status: 400 });
    }

  const prisma = await getPrismaClient();
  const scenarios: ScenarioRec[] = await prisma.scenario.findMany({
      select: { id: true, title: true, description: true, image: true }
    });

    const scored = scenarios.map((s: ScenarioRec) => {
      const combined: string = `${s.title} ${s.description}`;
      const score: number = stringSimilarity.compareTwoStrings(prompt, combined) as number;
      return { ...s, score };
    });

    const recommended: ScenarioRec[] = scored
      .sort((a, b) => (b.score as number) - (a.score as number))
      .slice(0, 5)
      .map(({ id, title, description, image }) => ({ id, title, description, image }));

    return NextResponse.json(recommended);
  } catch (error) {
    console.error('시나리오 추천 오류:', error);
    return NextResponse.json({ error: '시나리오 추천에 실패했습니다.' }, { status: 500 });
  }
}
