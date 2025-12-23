import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) {
    return email;
  }
  if (local.length <= 3) {
    return `${local.charAt(0)}***@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, '');
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const { name, phone } = body as { name?: string; phone?: string };
  if (!name || !phone) {
    return NextResponse.json({ error: '이름과 전화번호를 모두 입력해 주세요.' }, { status: 400 });
  }

  const sanitizedPhone = normalizePhone(phone);
  if (!sanitizedPhone) {
    return NextResponse.json({ error: '전화번호 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      name,
    },
    include: {
      customerProfile: true,
      investigator: true,
    },
    take: 10,
  });

  const matched = candidates.filter((user) => {
    const customerPhone = user.customerProfile?.phone ? normalizePhone(user.customerProfile.phone) : null;
    const investigatorPhone = user.investigator?.contactPhone
      ? normalizePhone(user.investigator.contactPhone)
      : null;
    return customerPhone === sanitizedPhone || investigatorPhone === sanitizedPhone;
  });

  if (matched.length === 0) {
    return NextResponse.json({ error: '일치하는 계정을 찾을 수 없습니다.' }, { status: 404 });
  }

  return NextResponse.json({
    emails: matched.map((user) => ({ id: user.id, email: maskEmail(user.email) })),
  });
}
