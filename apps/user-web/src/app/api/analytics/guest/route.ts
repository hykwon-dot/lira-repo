import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.guestId !== 'string' || typeof body.sessionId !== 'string' || typeof body.action !== 'string') {
      return NextResponse.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    const { guestId, sessionId, action, caseType, payload } = body;

    // Validate lengths to prevent abuse
    if (guestId.length > 100 || sessionId.length > 100 || action.length > 50 || (caseType && caseType.length > 50)) {
      return NextResponse.json({ error: 'PAYLOAD_TOO_LARGE' }, { status: 400 });
    }

    const prisma = await getPrismaClient();

    const log = await prisma.guestActivityLog.create({
      data: {
        guestId,
        sessionId,
        action,
        caseType: caseType ?? null,
        payload: payload ?? Prisma.JsonNull,
      },
    });

    return NextResponse.json({ success: true, id: log.id }, { status: 201 });
  } catch (error) {
    console.error('[API][analytics][guest] Failed to create guest log:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
