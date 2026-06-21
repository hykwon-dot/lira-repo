import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';
import { recordAuditEvent } from '@/lib/audit';
import { InvestigatorStatus } from '@prisma/client';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireCapability(req, 'investigator.approve');
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const {
    user: { id: reviewerId },
  } = authResult;

  const investigatorId = Number(params.id);
  if (!Number.isFinite(investigatorId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    payload = undefined;
  }
  const note = isRecord(payload) && typeof payload.note === 'string' ? payload.note : undefined;

  const prisma = await getPrismaClient();
  const profile = await prisma.investigatorProfile.findUnique({
    where: { id: investigatorId },
    include: { user: true },
  });
  if (!profile) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
  if (profile.status === InvestigatorStatus.APPROVED) {
    return NextResponse.json({ error: 'ALREADY_APPROVED' }, { status: 409 });
  }

  const updated = await prisma.investigatorProfile.update({
    where: { id: investigatorId },
    data: {
      status: InvestigatorStatus.APPROVED,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
      reviewedBy: { connect: { id: reviewerId } },
    },
    include: { user: true, reviewedBy: true },
  });

  await recordAuditEvent({
    actorId: reviewerId,
    action: 'INVESTIGATOR_APPROVED',
    targetType: 'InvestigatorProfile',
    targetId: investigatorId,
    metadata: {
      previousStatus: profile.status,
      note,
    },
  });

  return NextResponse.json({
    message: 'INVESTIGATOR_APPROVED',
    investigator: updated,
  });
}
