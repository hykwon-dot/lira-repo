import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Public endpoint: returns only visible testimonials, ordered for home page
export async function GET() {
  try {
    const prisma = await getPrismaClient();
    const testimonials = await prisma.testimonial.findMany({
      where: { isVisible: true },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Failed to fetch testimonials', error);
    return NextResponse.json({ error: 'Failed to fetch testimonials' }, { status: 500 });
  }
}
