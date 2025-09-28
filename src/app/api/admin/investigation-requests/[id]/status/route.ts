import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import {
  REQUEST_STATUSES,
  STATUS_TRANSITIONS,
  REQUEST_INCLUDE,
  serializeRequest,
  RequestStatus,
} from '@/app/api/investigation-requests/shared';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const requestId = Number(params.id);
  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  let nextStatus: RequestStatus | null = null;
  try {
    const payload = await req.json();
    if (payload && typeof payload.status === 'string') {
      const statusCandidate = payload.status.toUpperCase();
      nextStatus = (REQUEST_STATUSES as readonly string[]).includes(statusCandidate)
        ? (statusCandidate as RequestStatus)
        : null;
    }
  } catch {
    nextStatus = null;
  }

  if (!nextStatus) {
    return NextResponse.json({ error: 'INVALID_STATUS' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const existing = await prisma.investigationRequest.findUnique({
    where: { id: requestId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (existing.status === nextStatus) {
    return NextResponse.json({ error: 'STATUS_UNCHANGED' }, { status: 409 });
  }

  const allowedTransitions = STATUS_TRANSITIONS[existing.status as RequestStatus] || [];
  if (!allowedTransitions.includes(nextStatus)) {
    return NextResponse.json({ error: 'TRANSITION_NOT_ALLOWED' }, { status: 409 });
  }

  const updated = await prisma.investigationRequest.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
    },
    include: REQUEST_INCLUDE,
  });

  return NextResponse.json({
    message: 'REQUEST_STATUS_UPDATED',
    request: serializeRequest(updated),
  });
}
