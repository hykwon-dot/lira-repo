import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const prisma = await getPrismaClient();
    const testimonials = await prisma.testimonial.findMany({
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Failed to fetch admin testimonials', error);
    return NextResponse.json({ error: 'Failed to fetch admin testimonials' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { name, role, content, avatarUrl, isVisible = true, order = 0 } = body;

    if (!name || !content) {
      return NextResponse.json({ error: 'name and content are required' }, { status: 400 });
    }

    const prisma = await getPrismaClient();
    const testimonial = await prisma.testimonial.create({
      data: {
        name,
        role: role ?? null,
        content,
        avatarUrl: avatarUrl ?? null,
        isVisible: Boolean(isVisible),
        order: typeof order === 'number' ? order : 0,
      },
    });

    return NextResponse.json({ testimonial });
  } catch (error) {
    console.error('Failed to create testimonial', error);
    return NextResponse.json({ error: 'Failed to create testimonial' }, { status: 500 });
  }
}
