import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import {
  getSimulationEventDelegate,
  getSimulationRunDelegate,
  requireAuthUser,
} from '../../utils';
import type { SimulationEventType, SimulationRunStatus } from '@prisma/client';

const EVENT_TYPES = new Set<SimulationEventType>(['PHASE_ENTERED', 'TASK_STATUS_CHANGED', 'NOTE_ADDED']);
const RUN_STATUSES = new Set<SimulationRunStatus>(['ACTIVE', 'COMPLETED', 'CANCELLED']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSimulationEventType = (value: unknown): value is SimulationEventType =>
  typeof value === 'string' && EVENT_TYPES.has(value as SimulationEventType);

const isSimulationRunStatus = (value: unknown): value is SimulationRunStatus =>
  typeof value === 'string' && RUN_STATUSES.has(value as SimulationRunStatus);

type RouteContext = {
  params: {
    runId: string;
  };
};

function parseRunId(value: string) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const auth = await requireAuthUser(req);
  if ('response' in auth) {
    return auth.response;
  }

  const runId = parseRunId(context.params.runId);
  if (!runId) {
    return NextResponse.json({ error: 'INVALID_RUN_ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!isRecord(body) || !isSimulationEventType(body.eventType)) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
  }

  const eventType = body.eventType;

  const payload = isRecord(body.payload) ? body.payload : body.payload ?? {};
  const phaseId = typeof body.phaseId === 'number' ? body.phaseId : null;
  const taskId = typeof body.taskId === 'number' ? body.taskId : null;

  try {
    const prisma = await getPrismaClient();
    const runDelegate = await getSimulationRunDelegate();
    const run = await runDelegate.findFirst({
      where: {
        id: runId,
        userId: auth.user.id,
      },
    });

    if (!run) {
      return NextResponse.json({ error: 'RUN_NOT_FOUND' }, { status: 404 });
    }

    if (phaseId) {
      const phase = await prisma.phase.findFirst({
        where: {
          id: phaseId,
          scenarioId: run.scenarioId,
        },
      });
      if (!phase) {
        return NextResponse.json({ error: 'PHASE_NOT_FOUND' }, { status: 404 });
      }
    }

    if (taskId) {
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          phase: {
            scenarioId: run.scenarioId,
          },
        },
      });
      if (!task) {
        return NextResponse.json({ error: 'TASK_NOT_FOUND' }, { status: 404 });
      }
    }

  const eventDelegate = await getSimulationEventDelegate();
  const createdEvent = await eventDelegate.create({
      data: {
        runId,
        userId: auth.user.id,
        eventType,
        payload,
        phaseId,
        taskId,
      },
    });

    const updates: Record<string, unknown> = {};

    if (eventType === 'PHASE_ENTERED' && phaseId) {
      updates.currentPhaseId = phaseId;
    }

    if (isSimulationRunStatus(body.runStatus)) {
      updates.status = body.runStatus;
      if (body.runStatus === 'COMPLETED' && !body.completedAt) {
        updates.completedAt = new Date();
      }
    }

    if ('completedAt' in body && body.completedAt !== undefined) {
      if (body.completedAt === null) {
        updates.completedAt = null;
      } else if (typeof body.completedAt === 'string') {
        const parsed = new Date(body.completedAt);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'INVALID_COMPLETED_AT' }, { status: 400 });
        }
        updates.completedAt = parsed;
      }
    }

    if ('metadata' in body) {
      if (body.metadata === null) {
        updates.metadata = null;
      } else if (isRecord(body.metadata)) {
        updates.metadata = body.metadata;
      }
    }

    let updatedRun = run;
    if (Object.keys(updates).length > 0) {
      updatedRun = await runDelegate.update({
        where: { id: runId },
        data: updates,
      });
    }

    return NextResponse.json({ event: createdEvent, run: updatedRun });
  } catch (error) {
    console.error('[API][simulation][run][events][POST] Failed to create event', error);
    return NextResponse.json({ error: 'SIMULATION_EVENT_CREATE_FAILED' }, { status: 500 });
  }
}
