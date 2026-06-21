import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const prisma = await getPrismaClient();
    
    // Fetch data and total count in parallel
    const [scenarios, total] = await Promise.all([
      prisma.scenario.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          phases: {
            include: {
              tasks: true,
              risks: true,
            },
          },
        },
      }),
      prisma.scenario.count({ where: { isActive: true } })
    ]);
    
    return NextResponse.json({ items: scenarios, total });
  } catch (error) {
    console.error('[Scenario API Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await getPrismaClient();
    const { title, description, image } = await req.json();
    const scenario = await prisma.scenario.create({
      data: { title, description, image },
    });
    return NextResponse.json(scenario);
  } catch (error) {
    console.error('[Scenario Create Error]', error);
    return NextResponse.json({ error: 'Failed to create scenario' }, { status: 500 });
  }
}
