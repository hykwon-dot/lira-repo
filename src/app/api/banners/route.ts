import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prisma = await getPrismaClient();
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Failed to fetch banners', error);
    return NextResponse.json({ error: 'Failed to fetch banners' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { title, imageUrl, linkUrl, type, isActive, order } = body;
    const prisma = await getPrismaClient();
    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        type: type || 'MAIN_LARGE',
        isActive: isActive ?? true,
        order: order ?? 0,
      },
    });
    return NextResponse.json({ banner });
  } catch (error) {
    console.error('Failed to create banner', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
