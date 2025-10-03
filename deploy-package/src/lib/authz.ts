import { NextRequest, NextResponse } from 'next/server';
import { hasCapability, Capability, Role } from './rbac';
import { getPrismaClient } from './prisma';
import { verifyToken } from './jwt';

function extractBearer(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (!h) return null;
  const [scheme, token] = h.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token.trim();
}

export async function requireCapability(req: NextRequest, capability: Capability) {
  try {
    const token = extractBearer(req);
    if (!token) {
      return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
    }
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
    }
    const prisma = await getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    const role = user.role as Role;
    if (!hasCapability(role, capability)) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return { user, payload } as const;
  } catch (e) {
    console.error('AuthZ error', e);
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}

export async function requireAuth(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) return NextResponse.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
  return { user, payload } as const;
}
