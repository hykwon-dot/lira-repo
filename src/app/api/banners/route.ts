import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';
import { uploadBase64ToS3 } from '@/lib/s3';

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
    let { title, imageUrl, linkUrl, type, isActive, order, clickAction, targetId } = body;
    const prisma = await getPrismaClient();

    // S3 Upload if imageUrl is Base64
    if (imageUrl && imageUrl.startsWith('data:image/')) {
        try {
            imageUrl = await uploadBase64ToS3(imageUrl, `banner_${Date.now()}`, "banners", true);
        } catch (e) {
            console.error('S3 Upload failed for banner', e);
        }
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        imageUrl,
        linkUrl,
        type: type || 'MAIN_LARGE',
        clickAction: clickAction || 'LINK',
        targetId: targetId ? parseInt(String(targetId)) : null,
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
