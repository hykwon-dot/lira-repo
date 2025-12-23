import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { getSimulationRunDelegate, requireAuthUser } from '../utils';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type RouteContext = {
  params: {
    runId: string;
  };
};

function parseRunId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if ('response' in auth) {
    return auth.response;
  }

  const runId = parseRunId(context.params.runId);
  if (!runId) {
    return NextResponse.json({ error: 'INVALID_RUN_ID' }, { status: 400 });
  }

  try {
    const delegate = await getSimulationRunDelegate();
    const run = await delegate.findFirst({
      where: {
        id: runId,
        userId: auth.user.id,
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
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'RUN_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    console.error('[API][simulation][runId][GET] Failed to fetch run', error);
    return NextResponse.json({ error: 'SIMULATION_RUN_FETCH_FAILED' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if ('response' in auth) {
    return auth.response;
  }

  const runId = parseRunId(context.params.runId);
  if (!runId) {
    return NextResponse.json({ error: 'INVALID_RUN_ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!isRecord(body)) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  try {
    const prisma = await getPrismaClient();
    const delegate = await getSimulationRunDelegate();

    const existing = await delegate.findFirst({
      where: {
        id: runId,
        userId: auth.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'RUN_NOT_FOUND' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    const allowedStatuses = new Set(['ACTIVE', 'COMPLETED', 'CANCELLED']);

    if (typeof body.status === 'string') {
      if (!allowedStatuses.has(body.status)) {
        return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
      }
      data.status = body.status;
      if (body.status === 'COMPLETED' && !body.completedAt && !existing.completedAt) {
        data.completedAt = new Date();
      }
    }

    if ('currentPhaseId' in body) {
      if (body.currentPhaseId === null) {
        data.currentPhaseId = null;
      } else if (typeof body.currentPhaseId === 'number') {
  const phase = await prisma.phase.findFirst({
          where: {
            id: body.currentPhaseId,
            scenarioId: existing.scenarioId,
          },
        });
        if (!phase) {
          return NextResponse.json({ error: 'PHASE_NOT_FOUND' }, { status: 404 });
        }
        data.currentPhaseId = body.currentPhaseId;
      }
    }

    if ('metadata' in body) {
      if (body.metadata === null) {
        data.metadata = null;
      } else if (isRecord(body.metadata)) {
        data.metadata = body.metadata;
      }
    }

    if ('completedAt' in body) {
      if (body.completedAt === null) {
        data.completedAt = null;
      } else if (typeof body.completedAt === 'string') {
        const parsedDate = new Date(body.completedAt);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'INVALID_COMPLETED_AT' }, { status: 400 });
        }
        data.completedAt = parsedDate;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'NO_CHANGES' }, { status: 400 });
    }

    const updated = await delegate.update({
      where: { id: existing.id },
      data,
      include: {
        scenario: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({ run: updated });
  } catch (error) {
    console.error('[API][simulation][runId][PATCH] Failed to update run', error);
    return NextResponse.json({ error: 'SIMULATION_RUN_UPDATE_FAILED' }, { status: 500 });
  }
}
