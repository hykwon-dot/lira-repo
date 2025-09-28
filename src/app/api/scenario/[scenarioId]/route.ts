import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { scenarioId: string } }
) {
  try {
    const scenarioId = parseInt(params.scenarioId, 10);

    if (isNaN(scenarioId)) {
      return NextResponse.json({ error: 'Invalid scenario ID' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId },
      include: {
        phases: {
          orderBy: {
            scheduleOffset: 'asc',
          },
          include: {
            tasks: true,
            risks: true,
          },
        },
      },
    });

    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }

    return NextResponse.json(scenario);
  } catch (error) {
    console.error(`Error fetching scenario ${params.scenarioId}:`, error);
    return NextResponse.json({ error: 'Failed to fetch scenario' }, { status: 500 });
  }
}
