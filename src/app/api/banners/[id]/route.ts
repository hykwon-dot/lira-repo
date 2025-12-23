import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const { title, imageUrl, linkUrl, type, isActive, order } = body;
    const prisma = await getPrismaClient();
    const banner = await prisma.banner.update({
      where: { id },
      data: {
        title,
        imageUrl,
        linkUrl,
        type,
        isActive,
        order,
      },
    });
    return NextResponse.json({ banner });
  } catch (error) {
    console.error('Failed to update banner', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const id = parseInt(params.id);
    const prisma = await getPrismaClient();
    await prisma.banner.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete banner', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
