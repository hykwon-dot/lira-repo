import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { requireCapability } from '@/lib/authz';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const prisma = await getPrismaClient();
    const awards = await prisma.award.findMany({
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ awards });
  } catch (error) {
    console.error('Failed to fetch awards', error);
    return NextResponse.json({ error: 'Failed to fetch awards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireCapability(req, 'site.content.manage');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { title, description, imageUrl, date } = body;
    const prisma = await getPrismaClient();
    const award = await prisma.award.create({
      data: {
        title,
        description,
        imageUrl,
        date: date ? new Date(date) : undefined,
      },
    });
    return NextResponse.json({ award });
  } catch (error) {
    console.error('Failed to create award', error);
    return NextResponse.json({ error: 'Failed to create award' }, { status: 500 });
  }
}
