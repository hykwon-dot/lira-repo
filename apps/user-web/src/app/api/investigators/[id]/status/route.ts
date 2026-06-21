import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';
import { recordAuditEvent } from '@/lib/audit';
import { InvestigatorStatus } from '@prisma/client';

export async function PATCH(
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
  const body = await req.json();
  const { status, note } = body;

  if (![InvestigatorStatus.APPROVED, InvestigatorStatus.SUSPENDED].includes(status)) {
    return NextResponse.json({ error: 'INVALID_STATUS_TRANSITION' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const profile = await prisma.investigatorProfile.findUnique({
    where: { id: investigatorId },
  });

  if (!profile) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const updated = await prisma.investigatorProfile.update({
    where: { id: investigatorId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewNote: note || profile.reviewNote,
      reviewedBy: { connect: { id: reviewerId } },
    },
    include: { user: true },
  });

  await recordAuditEvent({
    actorId: reviewerId,
    action: status === InvestigatorStatus.SUSPENDED ? 'INVESTIGATOR_SUSPENDED' : 'INVESTIGATOR_ACTIVATED',
    targetType: 'InvestigatorProfile',
    targetId: investigatorId,
    metadata: {
      previousStatus: profile.status,
      newStatus: status,
      note,
    },
  });

  return NextResponse.json({
    message: 'STATUS_UPDATED',
    investigator: updated,
  });
}
