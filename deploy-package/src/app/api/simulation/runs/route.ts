import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getSimulationRunDelegate, requireAuthUser } from './utils';
import { Prisma } from '@prisma/client';

const MAX_LIMIT = 50;

const RUN_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;
const runStatusSet = new Set<string>(RUN_STATUSES);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { user } = auth;
  const search = req.nextUrl.searchParams;
  const scenarioIdParam = search.get('scenarioId');
  const statusParam = search.get('status');
  const limitParam = search.get('limit');
  const userIdParam = search.get('userId');

  const isAdminUser = auth.user.role === 'ADMIN' || auth.user.role === 'SUPER_ADMIN';

  const where: Record<string, unknown> = {
  };

  if (isAdminUser) {
    if (userIdParam) {
      const filterUserId = Number.parseInt(userIdParam, 10);
      if (!Number.isNaN(filterUserId)) {
        where.userId = filterUserId;
      }
    }
  } else {
    where.userId = user.id;
  }

  if (scenarioIdParam) {
    const scenarioId = Number.parseInt(scenarioIdParam, 10);
    if (!Number.isNaN(scenarioId)) {
      where.scenarioId = scenarioId;
    }
  }

  if (statusParam && runStatusSet.has(statusParam)) {
    where.status = statusParam;
  }

  let take = 20;
  if (limitParam) {
    const parsed = Number.parseInt(limitParam, 10);
    if (!Number.isNaN(parsed)) {
      take = Math.min(Math.max(parsed, 1), MAX_LIMIT);
    }
  }

  try {
    const runDelegate = await getSimulationRunDelegate();
    const items = await runDelegate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scenario: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[API][simulation][runs][GET] Failed to fetch runs', error);
    return NextResponse.json({ error: 'SIMULATION_RUN_FETCH_FAILED' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if ('response' in auth) {
    return auth.response;
  }

  const { user } = auth;
  const body = await req.json().catch(() => null);
  if (!isRecord(body) || typeof body.scenarioId !== 'number') {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const scenarioId = body.scenarioId;
  const currentPhaseId = typeof body.currentPhaseId === 'number' ? body.currentPhaseId : undefined;
  const metadata: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined =
    isRecord(body.metadata)
      ? (body.metadata as Prisma.JsonObject)
      : body.metadata === null
        ? Prisma.JsonNull
        : undefined;

  try {
    const prisma = await getPrismaClient();
    const scenario = await prisma.scenario.findUnique({ where: { id: scenarioId } });
    if (!scenario) {
      return NextResponse.json({ error: 'SCENARIO_NOT_FOUND' }, { status: 404 });
    }

    if (currentPhaseId) {
  const phaseExists = await prisma.phase.findFirst({
        where: {
          id: currentPhaseId,
          scenarioId,
        },
      });
      if (!phaseExists) {
        return NextResponse.json({ error: 'PHASE_NOT_FOUND' }, { status: 404 });
      }
    }

  const runDelegate = await getSimulationRunDelegate();
  const run = await runDelegate.create({
      data: {
        userId: user.id,
        scenarioId,
        currentPhaseId: currentPhaseId ?? null,
        status: 'ACTIVE',
  metadata,
      },
      include: {
        scenario: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
          },
        },
      },
    });

    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error('[API][simulation][runs][POST] Failed to create run', error);
    return NextResponse.json({ error: 'SIMULATION_RUN_CREATE_FAILED' }, { status: 500 });
  }
}
