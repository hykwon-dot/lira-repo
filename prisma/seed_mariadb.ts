import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[MariaDB Seed] 시작');

  const rawPass = process.env.SEED_PASSWORD || 'admin123';
  const passwordHash = await hash(rawPass, 10);

  // Admin 계정
  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {
      password: passwordHash,
      role: 'ADMIN' 
    },
    create: {
      email: 'admin@admin.com',
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

  // --- Success Cases Generator (Massive Data Seeding) ---
  console.log('[MariaDB Seed] Generating Success Scenarios...');
  
  // 기존 시나리오 삭제 (Clean state for demo)
  // FK 제약 조건 때문에 자식 테이블 먼저 삭제
  try {
    await prisma.phase.deleteMany({});
    // 다른 연관 테이블이 있다면 추가 삭제 필요 (예: SimulationRun 등)
    // SimulationRun이 Scenario를 참조한다면 삭제 필요
    const scenarioCount = await prisma.scenario.count();
    if (scenarioCount > 0) {
        // FK 제약 무시하고 삭제하는 방법이 위험하므로, 연결된 데이터가 있는지 확인하고 삭제하는 것이 좋으나
        // 개발 환경이므로 시나리오와 연관된 모든 데이터를 삭제합니다.
        // 현재 스키마상 SimulationRun이나 다른 테이블이 있을 수 있음.
        await (prisma as any).simulationRun?.deleteMany({});
        await prisma.scenario.deleteMany({});
    }
  } catch (e) {
    console.warn('[MariaDB Seed] 기존 데이터 삭제 중 오류 (무시하고 진행):', e);
  }

  const regions = ['서울 Gangnam', '부산 Haeundae', '인천 Airport', '경기 Pangyo', '제주 Island', '대전 Center', '대구 Industrial'];
  const caseTypes = [
    { type: '기업 횡령', items: ['자금 횡령', '법인카드 유용', '비자금 조성', '회계 조작'] },
    { type: '산업 스파이', items: ['기술 유출', '인력 빼가기', '영업비밀 매매', '디자인 도용'] },
    { type: '개인 신변', items: ['스토킹 피해', '실종자 찾기', '채무자 추적', '불륜/가정문제'] },
    { type: '디지털 범죄', items: ['해킹 추적', '온라인 사기', '악플러 특정', '데이터 복구'] },
  ];
  
  const investigatorNotes = [
    "초기 증거 확보가 결정적이었습니다.",
    "의뢰인의 신속한 제보 덕분에 골든타임을 지킬 수 있었습니다.",
    "디지털 포렌식을 통해 삭제된 데이터를 복원한 것이 주요했습니다.",
    "장기간의 잠복 근무 끝에 결정적 현장을 포착했습니다.",
    "관계자들과의 꾸준한 라포 형성으로 내부 증언을 확보했습니다."
  ];

  const totalScenariosToCreate = 1000; // Demo: 1000 cases (Can scale to 10k)
  
  // Batch processing
  const batchSize = 50;
  
  for(let i = 0; i < totalScenariosToCreate; i+= batchSize) {
     const batch = [];
     for(let j = 0; j < batchSize; j++) {
        if(i + j >= totalScenariosToCreate) break;
        
        const typeObj = caseTypes[Math.floor(Math.random() * caseTypes.length)];
        const subType = typeObj.items[Math.floor(Math.random() * typeObj.items.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const difficulty = Math.random() > 0.7 ? '상' : (Math.random() > 0.4 ? '중' : '하');
        const duration = Math.floor(Math.random() * 30) + 7; // 7 ~ 37 days
        const budget = Math.floor(Math.random() * 500) * 10000 + 1000000; // 1M ~ 6M KRW approx logic
        
        const title = `[${typeObj.type}] ${region} ${subType} 해결 사례`;
        const objective = `${subType} 정황을 포착하고 결정적 증거를 확보하여 의뢰인에게 전달함.`;
        
        batch.push(
           prisma.scenario.create({
             data: {
               title: title,
               description: objective,
               difficulty: difficulty,
               // Using 'overview' JSON field to store case report details
               overview: {
                 objective: objective,
                 background: `${region} 지역에서 발생한 ${subType} 건으로, 의뢰인은 익명의 제보를 통해 사건을 인지함.`,
                 solution: "전담 팀 구성 및 24시간 모니터링, 디지털 포렌식 병행.",
                 outcome: "증거 확보 100% 달성 및 법적 대응 자료 완비.",
                 investigatorNote: investigatorNotes[Math.floor(Math.random() * investigatorNotes.length)]
               },
               // Dummy JSON fields for schema compatibility
               spendTracking: {},
               raciMatrix: {},
               scheduleTemplate: {},
               
               phases: {
                 create: [
                   {
                     phaseKey: "P1",
                     name: "기초 조사",
                     durationDays: Math.floor(duration * 0.2),
                     scheduleOffset: 0,
                     budget: {},
                     phaseKPI: {},
                     deliverables: ["기초 조사 보고서"]
                   },
                   {
                     phaseKey: "P2",
                     name: "심층 추적",
                     durationDays: Math.floor(duration * 0.5),
                     scheduleOffset: Math.floor(duration * 0.2),
                     budget: {},
                     phaseKPI: {},
                     deliverables: ["중간 브리핑", "증거 영상"]
                   },
                   {
                     phaseKey: "P3",
                     name: "결과 보고",
                     durationDays: Math.floor(duration * 0.3),
                     scheduleOffset: Math.floor(duration * 0.7),
                     budget: {},
                     phaseKPI: {},
                     deliverables: ["최종 보고서", "법률 자문 연계"]
                   }
                 ]
               }
             }
           })
        );
     }
     await prisma.$transaction(batch);
     console.log(`[MariaDB Seed] Created scenarios outcome batch ${i} ~ ${i + batchSize}`);
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
