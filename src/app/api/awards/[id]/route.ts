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
    const { title, description, imageUrl, date } = body;
    const prisma = await getPrismaClient();
    const award = await prisma.award.update({
      where: { id },
      data: {
        title,
        description,
        imageUrl,
        date: date ? new Date(date) : undefined,
      },
    });
    return NextResponse.json({ award });
  } catch (error) {
    console.error('Failed to update award', error);
    return NextResponse.json({ error: 'Failed to update award' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const id = parseInt(params.id);
    const prisma = await getPrismaClient();
    await prisma.award.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete award', error);
    return NextResponse.json({ error: 'Failed to delete award' }, { status: 500 });
  }
}
