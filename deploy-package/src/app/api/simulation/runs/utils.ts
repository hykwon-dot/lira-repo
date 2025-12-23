import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getPrismaClient } from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

export async function requireAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) {
    return {
      response: NextResponse.json({ error: 'NO_TOKEN' }, { status: 401 }),
      user: null,
    } as const;
  }

  const [scheme, token] = auth.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') {
    return {
      response: NextResponse.json({ error: 'INVALID_AUTH_HEADER' }, { status: 401 }),
      user: null,
    } as const;
  }

  const payload = verifyToken(token);
  if (!payload) {
    return {
      response: NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 }),
      user: null,
    } as const;
  }

  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return {
      response: NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 }),
      user: null,
    } as const;
  }

  return { user } as const;
}

type SimulationRunDelegate = PrismaClient['simulationRun'];

type SimulationEventDelegate = PrismaClient['simulationEvent'];

export async function getSimulationRunDelegate(): Promise<SimulationRunDelegate> {
  const prisma = await getPrismaClient();
  return prisma.simulationRun;
}

export async function getSimulationEventDelegate(): Promise<SimulationEventDelegate> {
  const prisma = await getPrismaClient();
  return prisma.simulationEvent;
}
