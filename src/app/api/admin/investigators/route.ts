import { NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const prisma = await getPrismaClient();
  const { searchParams } = new URL(request.url);
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';

  try {
    const whereClause: any = {
      deletedAt: null,
      user: { deletedAt: null },
    };

    // Filter by status if provided, otherwise show all managed statuses
    if (status) {
      whereClause.status = status;
    } else {
      whereClause.status = { in: ['APPROVED', 'SUSPENDED', 'WITHDRAWN'] };
    }

    // Filter by name or email if search string provided
    if (search) {
      whereClause.user = {
        ...whereClause.user,
        OR: [
          { name: { contains: search } },
          { email: { contains: search } },
        ],
      };
    }

    const [total, investigators] = await Promise.all([
      prisma.investigatorProfile.count({
        where: whereClause,
      }),
      prisma.investigatorProfile.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          licenseNumber: true,
          experienceYears: true,
          specialties: true,
          status: true,
          reviewNote: true,
          createdAt: true,
          contactPhone: true,
          agencyPhone: true,
          officeAddress: true,
          serviceArea: true,
          introduction: true,
          portfolioUrl: true,
          businessLicenseUrl: true,
          pledgeUrl: true,
          termsUrl: true,
          idCardUrl: true,
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

    return NextResponse.json({
      investigators,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin Investigators API Error]', error);
    return NextResponse.json(
      { error: '조사원 목록을 불러오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
