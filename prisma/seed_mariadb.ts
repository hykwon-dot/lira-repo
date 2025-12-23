import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[MariaDB Seed] 시작');

  const rawPass = process.env.SEED_PASSWORD || 'ChangeMe123!';
  const passwordHash = await hash(rawPass, 10);

  // Admin 계정
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lira.local' },
    update: {},
    create: {
      email: 'admin@lira.local',
      name: '운영관리자',
  password: passwordHash,
      role: 'ADMIN'
    }
  });

  // Super Admin 계정
  let superAdmin = await prisma.user.findUnique({ where: { email: 'root@lira.local' } });
  if (!superAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: 'root@lira.local',
        name: '총괄관리자',
    password: passwordHash,
        role: 'SUPER_ADMIN'
      }
    });
  }

  // Investigator (PENDING)
  const investigator = await prisma.user.upsert({
    where: { email: 'investigator1@lira.local' },
    update: {},
    create: {
      email: 'investigator1@lira.local',
      name: '홍길동 조사원',
        password: passwordHash,
      role: 'INVESTIGATOR'
    }
  });
  // 프로필 존재 없으면 생성
  const existingInvProfile = await (prisma as any).investigatorProfile.findUnique({ where: { userId: investigator.id } });
  if (!existingInvProfile) {
  await (prisma as any).investigatorProfile.create({
      data: {
        userId: investigator.id,
        specialties: ['디지털포렌식','추적','면담'],
        licenseNumber: 'LIC-TEST-001',
        experienceYears: 3,
      }
    });
  }

  // Enterprise 사용자
  const enterpriseUser = await prisma.user.upsert({
    where: { email: 'corp1@lira.local' },
    update: {},
    create: {
      email: 'corp1@lira.local',
      name: '엔터프라이즈 담당자',
  password: passwordHash,
      role: 'ENTERPRISE'
    }
  });
  let enterpriseOrg = await (prisma as any).organization.findFirst({ where: { ownerId: enterpriseUser.id } });
  if (!enterpriseOrg) {
    enterpriseOrg = await (prisma as any).organization.create({
      data: {
        name: 'LIRA Test Corp',
        businessNumber: '123-45-67890',
        contactName: '엔터프라이즈 담당자',
        contactPhone: '02-1234-5678',
        sizeCode: 'SMB',
        note: 'Seeded organization for development.',
        ownerId: enterpriseUser.id,
      },
    });
  }
  const ownerMembership = await (prisma as any).organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: enterpriseOrg.id,
        userId: enterpriseUser.id,
      },
    },
  });
  if (!ownerMembership) {
    await (prisma as any).organizationMember.create({
      data: {
        organizationId: enterpriseOrg.id,
        userId: enterpriseUser.id,
        role: 'OWNER',
      },
    });
  }

  const enterpriseOpsUser = await prisma.user.upsert({
    where: { email: 'corp-ops@lira.local' },
    update: {
      name: '엔터프라이즈 운영 매니저',
    },
    create: {
      email: 'corp-ops@lira.local',
      name: '엔터프라이즈 운영 매니저',
  password: passwordHash,
      role: 'ENTERPRISE',
    },
  });

  const opsMembership = await (prisma as any).organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: enterpriseOrg.id,
        userId: enterpriseOpsUser.id,
      },
    },
  });

  if (!opsMembership) {
    await (prisma as any).organizationMember.create({
      data: {
        organizationId: enterpriseOrg.id,
        userId: enterpriseOpsUser.id,
        role: 'ADMIN',
        invitedById: enterpriseUser.id,
      },
    });
  }

  // 기본 고객 계정
  const customer = await prisma.user.upsert({
    where: { email: 'customer1@lira.local' },
    update: {},
    create: {
      email: 'customer1@lira.local',
      name: '김의뢰',
  password: passwordHash,
      role: 'USER'
    }
  });
  const existingCustomerProfile = await (prisma as any).customerProfile.findUnique({ where: { userId: customer.id } });
  if (!existingCustomerProfile) {
    await (prisma as any).customerProfile.create({
      data: {
        userId: customer.id,
        displayName: '의뢰자 Kim',
        phone: '010-1234-5678',
        birthDate: new Date('1990-05-15'),
        gender: 'FEMALE',
        occupation: '마케팅 매니저',
        region: '서울 강남구',
        preferredCaseTypes: ['INFIDELITY', 'BACKGROUND_CHECK'],
        budgetMin: 800000,
        budgetMax: 3000000,
        urgencyLevel: 'MEDIUM',
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        marketingOptIn: true,
      }
    });
  }

  // 기본 시나리오 2개
  const scenarioPayloads = [
    {
      title: '배우자 의심 행적 조사',
      description: '배우자의 특정 시간대 행적 및 접촉 인물 파악',
      category: '개인사례',
      difficulty: '중간',
      riskLevel: 'MEDIUM',
      caseType: 'INFIDELITY',
      successRate: 78,
      typicalDurationDays: 10,
      budgetRange: { min: 800000, max: 2500000 }
    },
    {
      title: '기업 내부 정보 유출 사건',
      description: '내부 시스템 접근 기록 기반 유출 경로 식별',
      category: '기업조사',
      difficulty: '어려움',
      riskLevel: 'HIGH',
      caseType: 'IP_LEAK',
      successRate: 65,
      typicalDurationDays: 21,
      budgetRange: { min: 3000000, max: 12000000 }
    }
  ];

  for (const s of scenarioPayloads) {
    await prisma.scenario.create({ data: s });
  }

  console.log('[MariaDB Seed] 완료 (공통 패스워드=' + rawPass + '):', {
    admin: admin.id,
    superAdmin: superAdmin.id,
    investigator: investigator.id,
    enterpriseOwner: enterpriseUser.id,
    enterpriseOrganization: enterpriseOrg?.id,
    enterpriseAdmin: enterpriseOpsUser.id,
  });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
