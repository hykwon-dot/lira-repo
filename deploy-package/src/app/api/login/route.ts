import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { verifyPassword } from '@/lib/hash';
import { signToken } from '@/lib/jwt';

export const dynamic = 'force-dynamic';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!isRecord(body) || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return NextResponse.json({ error: '이메일/비밀번호 필요' }, { status: 400 });
    }
    const email = body.email.trim();
    const password = body.password;
    if (!email || !password) {
      return NextResponse.json({ error: '이메일/비밀번호 필요' }, { status: 400 });
    }
  const prisma = await getPrismaClient();
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
      include: {
        investigator: {
          select: {
            status: true,
          },
        },
        ownedOrganizations: {
          include: {
            members: {
              select: {
                id: true,
                userId: true,
                role: true,
                invitedById: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        organizationMemberships: {
          include: {
            organization: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json(
        { error: '등록되지 않은 이메일입니다.', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }
    const ok = await verifyPassword(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다.', code: 'INVALID_PASSWORD' },
        { status: 401 }
      );
    }
    if (user.role === 'INVESTIGATOR') {
      const status = user.investigator?.status ?? null;
      if (status !== 'APPROVED') {
        return NextResponse.json({ error: '승인 대기 중입니다.', code: 'INVESTIGATOR_PENDING' }, { status: 403 });
      }
    }
    const token = signToken({ userId: Number(user.id), role: user.role });
    const { investigator: investigatorRelation, ...userWithoutInvestigator } = user;
    const { password: removedPassword, ...safe } = userWithoutInvestigator;
    void removedPassword;
    return NextResponse.json({
      token,
      user: {
        ...safe,
        investigatorStatus: investigatorRelation?.status ?? null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
