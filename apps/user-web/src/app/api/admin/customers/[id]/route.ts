import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const customerId = Number(params.id);
  if (!Number.isFinite(customerId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const profile = await prisma.customerProfile.findFirst({
    where: {
      id: customerId,
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
  const archivedName = profile.user.name ? `${profile.user.name} (삭제됨)` : '삭제된 고객';

  await prisma.$transaction(async (tx) => {
    await tx.investigationRequest.updateMany({
      where: { userId: profile.userId },
      data: { status: 'CANCELLED', investigatorId: null },
    });
    await tx.customerProfile.update({
      where: { id: customerId },
      data: {
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
    message: 'CUSTOMER_DELETED',
    customerId,
    userId: profile.userId,
  });
}
