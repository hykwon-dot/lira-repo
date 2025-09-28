import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET() {
  const prisma = await getPrismaClient();
  const [
    totalUsers,
    newUsersWeek,
    investigatorCounts,
    requestCounts,
    activeScenarios,
    pendingInvestigators,
    recentRequests,
    trendingScenarios,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: {
          gte: daysAgo(7),
        },
      },
    }),
    prisma.investigatorProfile.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.investigationRequest.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.scenario.count({
      where: { isActive: true },
    }),
    prisma.investigatorProfile.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.investigationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        scenario: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.scenario.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        createdAt: true,
      },
    }),
  ]);

  const investigatorStats = investigatorCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>,
  );

  const requestStats = requestCounts.reduce(
    (acc, item) => {
      acc[item.status] = item._count;
      return acc;
    },
    {} as Record<string, number>,
  );

  return NextResponse.json({
    stats: {
      totalUsers,
      newUsersWeek,
      investigator: investigatorStats,
      requests: requestStats,
      activeScenarios,
    },
    pendingInvestigators,
    recentRequests,
    trendingScenarios,
  });
}
