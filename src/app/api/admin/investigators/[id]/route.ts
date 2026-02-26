import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const profileId = Number(params.id);
  if (!Number.isFinite(profileId)) {
    return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { 
      introduction, 
      serviceArea, 
      specialties, 
      experienceYears, 
      contactPhone, 
      portfolioUrl, 
      avatarUrl 
    } = body;

    const prisma = await getPrismaClient();

    // Verify existence
    const existing = await prisma.investigatorProfile.findUnique({
      where: { id: profileId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const updated = await prisma.investigatorProfile.update({
      where: { id: profileId },
      data: {
        introduction,
        serviceArea,
        specialties,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        contactPhone,
        portfolioUrl,
        avatarUrl,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Failed to update investigator profile:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}

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
