import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const profileId = Number(params.id);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const profile = await prisma.investigatorProfile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      user: { deletedAt: null },
    },
    include: {
      user: true,
    },
  });

  if (!profile || !profile.user) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  const archivedEmail = `${profile.user.email}#deleted-${Date.now()}`;
  const archivedName = profile.user.name ? `${profile.user.name} (삭제됨)` : '삭제된 계정';

  await prisma.$transaction(async (tx) => {
    await tx.investigationRequest.updateMany({
      where: { investigatorId: profileId },
      data: { investigatorId: null, status: 'MATCHING' },
    });
    await tx.investigatorMatch.deleteMany({ where: { investigatorId: profileId } });
    await tx.investigatorProfile.update({
      where: { id: profileId },
      data: {
        status: 'REJECTED',
        deletedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: profile.userId },
      data: {
        deletedAt: new Date(),
        email: archivedEmail,
        name: archivedName,
      },
    });
  });

  return NextResponse.json({
    message: 'INVESTIGATOR_DELETED',
    investigatorId: profileId,
    userId: profile.userId,
  });
}
