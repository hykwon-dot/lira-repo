import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { getPrismaClient } from '@/lib/prisma';

function extractToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

export async function GET(req: NextRequest) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: 'NO_TOKEN' }, { status: 401 });
  const payload = verifyToken(token);
  if (!payload) return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 });
  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  const { password: removedPassword, ...safe } = user;
  void removedPassword;
  return NextResponse.json({ user: safe });
}
