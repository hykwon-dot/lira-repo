import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { InvestigatorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const investigatorId = Number(params.id);
  if (!Number.isFinite(investigatorId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  let note: string | undefined;
  try {
    const payload: unknown = await req.json();
    if (payload && typeof payload === 'object' && 'note' in payload && typeof (payload as { note?: unknown }).note === 'string') {
      note = (payload as { note: string }).note;
    }
  } catch {
    note = undefined;
  }

  const prisma = await getPrismaClient();
  const profile = await prisma.investigatorProfile.findUnique({
    where: { id: investigatorId },
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
      reviewNote: note ?? null,
      reviewedAt: new Date(),
      reviewedById: null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    message: 'INVESTIGATOR_APPROVED',
    investigator: updated,
  });
}
