import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/hash';

export const dynamic = 'force-dynamic';

function normalizePhone(phone?: string | null) {
  return phone ? phone.replace(/[^0-9]/g, '') : null;
}

function isPasswordStrong(value: string) {
  const checks = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[a-z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
  return checks >= 4;
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: '이메일을 입력해 주세요.' }, { status: 400 });
  }

  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 });
  }

  const [customerProfile, investigatorProfile] = await Promise.all([
    prisma.customerProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
      select: {
        contactPhone: true,
        deletedAt: true,
      },
    }),
  ]);

  const activeCustomer = customerProfile && !customerProfile.deletedAt ? customerProfile : null;
  const activeInvestigator = investigatorProfile && !investigatorProfile.deletedAt ? investigatorProfile : null;

  return NextResponse.json({
    hasSecurityQuestion: Boolean(activeCustomer?.securityQuestion),
    securityQuestion: activeCustomer?.securityQuestion ?? null,
    hasPhoneCheck: Boolean(activeCustomer?.phone || activeInvestigator?.contactPhone),
    displayName: user.name,
  });
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

  const { email, newPassword, securityAnswer, phone, name } = body as {
    email?: string;
    newPassword?: string;
    securityAnswer?: string;
    phone?: string;
    name?: string;
  };

  if (!email || !newPassword) {
    return NextResponse.json({ error: '이메일과 새 비밀번호를 모두 입력해 주세요.' }, { status: 400 });
  }
  if (!isPasswordStrong(newPassword)) {
    return NextResponse.json(
      { error: '대문자, 소문자, 숫자, 특수문자 중 최소 4가지를 포함한 8자 이상의 비밀번호를 입력해 주세요.' },
      { status: 400 },
    );
  }

  const prisma = await getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.deletedAt) {
    return NextResponse.json({ error: '계정을 찾을 수 없습니다.' }, { status: 404 });
  }

  if (user.password) {
    const sameAsOld = await verifyPassword(newPassword, user.password);
    if (sameAsOld) {
      return NextResponse.json(
        { error: '기존 비밀번호와 동일합니다. 새로운 비밀번호를 입력해 주세요.' },
        { status: 400 },
      );
    }
  }

  const [customerProfile, investigatorProfile] = await Promise.all([
    prisma.customerProfile.findUnique({
      where: { userId: user.id },
    }),
    prisma.investigatorProfile.findUnique({
      where: { userId: user.id },
      select: {
        contactPhone: true,
        deletedAt: true,
      },
    }),
  ]);

  const activeCustomer = customerProfile && !customerProfile.deletedAt ? customerProfile : null;
  const activeInvestigator = investigatorProfile && !investigatorProfile.deletedAt ? investigatorProfile : null;

  const sanitizedPhone = normalizePhone(phone);
  let verified = false;

  if (activeCustomer?.securityAnswerHash) {
    if (!securityAnswer) {
      return NextResponse.json({ error: '보안 질문의 답변이 필요합니다.' }, { status: 400 });
    }
    const matches = await verifyPassword(securityAnswer, activeCustomer.securityAnswerHash);
    if (!matches) {
      return NextResponse.json({ error: '보안 질문의 답변이 일치하지 않습니다.' }, { status: 403 });
    }
    verified = true;
  }

  if (!verified && sanitizedPhone) {
    const customerPhone = normalizePhone(activeCustomer?.phone);
    const investigatorPhone = normalizePhone(activeInvestigator?.contactPhone);
    if (customerPhone === sanitizedPhone || investigatorPhone === sanitizedPhone) {
      verified = true;
    }
  }

  if (!verified && name && user.name?.trim() === name.trim()) {
    verified = true;
  }

  if (!verified) {
    return NextResponse.json({ error: '계정 정보를 확인할 수 없습니다.' }, { status: 403 });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  return NextResponse.json({ message: 'PASSWORD_RESET', userId: user.id });
}
