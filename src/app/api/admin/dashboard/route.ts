import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function GET() {
  const prisma = await getPrismaClient();

  try {
  const [
    totalUsers,
    newUsersWeek,
    investigatorCounts,
    requestCounts,
    activeScenarios,
    pendingInvestigators,
    recentRequests,
    trendingScenarios,
    activeInvestigators,
    recentCustomers,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({
      where: {
        createdAt: { gte: daysAgo(7) },
        deletedAt: null,
      },
    }),
    prisma.investigatorProfile.groupBy({
      by: ['status'],
      _count: true,
      where: {
        deletedAt: null,
        user: { deletedAt: null },
      },
    }),
    prisma.investigationRequest.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.scenario.count({ where: { isActive: true } }),
    prisma.investigatorProfile.findMany({
      where: {
        status: 'PENDING',
        deletedAt: null,
        user: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
          id: true,
          licenseNumber: true,
          experienceYears: true,
          specialties: true,
          status: true,
          reviewNote: true,
          createdAt: true,
          contactPhone: true,
          businessLicenseData: true,
          pledgeData: true,
          termsData: true,
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
      where: {
        user: { deletedAt: null },
      },
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
            category: true,
            difficulty: true,
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
    prisma.investigatorProfile.findMany({
      where: {
        status: 'APPROVED',
        deletedAt: null,
        user: { deletedAt: null },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
          id: true,
          licenseNumber: true,
          experienceYears: true,
          specialties: true,
          status: true,
          reviewNote: true,
          createdAt: true,
          contactPhone: true,
          businessLicenseData: true,
          pledgeData: true,
          termsData: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.customerProfile.findMany({
      where: {
        deletedAt: null,
        user: { deletedAt: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        displayName: true,
        phone: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const investigatorStats = investigatorCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, { PENDING: 0, APPROVED: 0, REJECTED: 0 });

  const requestStats = requestCounts.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = item._count;
    return acc;
  }, {});

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
    activeInvestigators,
    recentCustomers,
  });
  } catch (error) {
    console.error('[Admin Dashboard API Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred in dashboard API' },
      { status: 500 }
    );
  }
}
