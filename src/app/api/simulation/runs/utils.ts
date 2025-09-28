import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

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

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return {
      response: NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 }),
      user: null,
    } as const;
  }

  return { user } as const;
}

type SimulationRunDelegate = typeof prisma.simulationRun;

type SimulationEventDelegate = typeof prisma.simulationEvent;

export function getSimulationRunDelegate(): SimulationRunDelegate {
  return prisma.simulationRun;
}

export function getSimulationEventDelegate(): SimulationEventDelegate {
  return prisma.simulationEvent;
}
