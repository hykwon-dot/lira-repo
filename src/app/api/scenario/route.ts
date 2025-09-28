import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export async function GET() {
  const prisma = await getPrismaClient();
  const scenarios = await prisma.scenario.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      phases: {
        include: {
          tasks: true,
          risks: true,
        },
      },
    },
  });
  return NextResponse.json(scenarios);
}

export async function POST(req: NextRequest) {
  const prisma = await getPrismaClient();
  const { title, description, image } = await req.json();
  const scenario = await prisma.scenario.create({
    data: { title, description, image },
  });
  return NextResponse.json(scenario);
}
