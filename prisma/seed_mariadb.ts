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

  // --- Success Cases Generator (Massive Data Seeding - Enhanced V2) ---
  console.log('[MariaDB Seed] Generating Success Scenarios (Detailed V2)...');
  
  // 기존 시나리오 삭제 (Clean state for demo)
  try {
    await prisma.phase.deleteMany({});
    const scenarioCount = await prisma.scenario.count();
    if (scenarioCount > 0) {
        // SimulationRun 등 연결된 테이블 삭제 (if exists)
        await (prisma as any).simulationRun?.deleteMany({});
        await prisma.scenario.deleteMany({});
    }
  } catch (e) {
    console.warn('[MariaDB Seed] 기존 데이터 삭제 중 오류 (무시하고 진행):', e);
  }

  // --- Detailed Blueprints ---
  const blueprints: Record<string, any> = {
    'corporate': {
      items: ['자금 횡령', '회계 부 정', '법인카드 유용', '비자금 조성'],
      backgrounds: [
        "사내 익명 게시판을 통해 회계팀장의 자금 유용 의혹이 제기됨. 재무제표 상 특정 거래처와의 반복적 현금 흐름이 이상 징후로 포착됨.",
        "해외 지사 설립 과정에서 승인되지 않은 거액의 자금이 송금된 정황 발견. 내부 감사가 비밀리에 착수됨.",
        "퇴사한 임원이 경쟁사로 이직하며 회사 자금을 개인 계좌로 빼돌린 정황 포착. 즉각적인 증거 보전이 필요한 상황."
      ],
      solutions: [
        "디지털 포렌식을 통해 삭제된 회계 장부 복원 및 이중 장부 확보. 법인카드 사용 내역과 개인 동선 CCTV 대조 분석 수행.",
        "해외 계좌 추적을 위해 현지 파트너 탐정사와 공조. 유령 회사(Paper Company)의 실소유주를 파악하기 위해 등기부 추적.",
        "핵심 용의자의 이메일 아카이빙 데이터 복구 및 사내 메신저 로그 분석으로 공범 관계 파악."
      ],
      outcomes: [
        "총 35억 원 규모의 횡령 사실 입증 및 전액 환수 조치 완료. 관련자 3명 형사 고발.",
        "비자금 조성 루트의 전체 구조도 파악. 이사회 보고 후 해당 임원 해임 및 민사 소송 승소.",
        "유출된 자본의 흐름을 동결하고, 해외 은닉 재산에 대한 가압류 처분 성공."
      ],
      notes: [
        "초기 보안 유지가 핵심이었습니다. 내부 감사팀과 비밀리에 협력하여 증거가 인멸되기 전 서버 데이터를 미러링한 것이 결정적이었습니다.",
        "단순 횡령이 아닌 조직적 범죄임을 간파하고, 성급한 혐의 추궁 대신 계좌 흐름을 끝까지 추적하여 공범까지 일망타진했습니다.",
        "용의자가 매우 치밀하게 디지털 흔적을 지웠으나, 클라우드 백업 로그에서 결정적 단서를 찾아낼 수 있었습니다."
      ],
      phases: [
        { name: "비밀 감사 착수", duration: 5, deliverables: ["이상 거래 리스트", "법인카드 분석표"] },
        { name: "디지털 증거 수집", duration: 10, deliverables: ["서버 포렌식 리포트", "이메일 복구 자료"] },
        { name: "자금 흐름 추적", duration: 15, deliverables: ["계좌 추적도", "은닉 재산 목록"] },
        { name: "법적 대응 준비", duration: 7, deliverables: ["소송 증거 책자", "피해 규모 산정서"] }
      ]
    },
    'industrial_espionage': {
      items: ['기술 유출', '설계도면 밀반출', '핵심인력 스카우트', '경쟁사 매수'],
      backgrounds: [
        "신제품 출시를 앞두고 경쟁사가 흡사한 특허를 출원함. 내부 개발팀 핵심 인원 2명의 최근 동향이 수상함.",
        "연구소 보안 구역 출입 기록에서 야간 및 휴일에 비인가 접속 시도가 다수 발견됨. 대용량 데이터 전송 로그 확인.",
        "협력업체를 통해 핵심 공정 기술이 제3국으로 유출되고 있다는 첩보 입수. 국가 핵심 기술에 해당하여 긴급 대응 필요."
      ],
      solutions: [
        "대상 직원의 PC 및 모바일 기기 정밀 포렌식으로 경쟁사 관계자와의 접촉 흔적(텔레그램, 시그널) 확보.",
        "연구소 내 네트워크 패킷 감청을 통해 외부 서버로의 데이터 업로드 패턴 분석. 이동식 저장매체(USB) 사용 이력 추적.",
        "퇴사 예정자에 대한 보안 인터뷰 진행 및 은밀한 미행을 통해 경쟁사 접선 현장 채증."
      ],
      outcomes: [
        "유출 시도 직전 공항에서 용의자 신병 확보 및 노트북 압수. 기술 유출 100% 차단 성공.",
        "경쟁사로 넘어간 설계도면 파일의 원본 해시값을 대조하여 저작권법 위반 입증. 경쟁사 압수수색 유도.",
        "산업보안법 위반으로 주동자 구속 및 협력업체와의 계약 파기. 손해배상 청구 진행 중."
      ],
      notes: [
        "기술 유출 사건은 타이밍 싸움입니다. 용의자가 출국하기 2시간 전 공항경찰대와 협조하여 저지한 긴박한 건이었습니다.",
        "내부자의 권한을 악용한 사례였기 때문에, 단순 로그 분석만으로는 잡기 어려웠습니다. 행동 패턴 분석(UEBA) 기법이 유효했습니다.",
        "단순한 이직 문제가 아닌, 조직적 산업 스파이 링(Ring)이 개입된 것을 밝혀내어 업계 전체의 경각심을 높였습니다."
      ],
      phases: [
        { name: "보안 로그 분석", duration: 3, deliverables: ["접속 기록 분석서", "데이터 전송 로그"] },
        { name: "대상자 모니터링", duration: 7, deliverables: ["동선 보고서", "통신 내용 요약"] },
        { name: "유출 경로 차단", duration: 5, deliverables: ["네트워크 차단 조치", "현장 검거 영상"] },
        { name: "피해 복구 및 인증", duration: 10, deliverables: ["기술 가치 평가서", "재발 방지 대책"] }
      ]
    },
    'infidelity': {
      items: ['외도 증거 수집', '상간자 신원 파악', '이혼 소송 자료', '양육권 분쟁'],
      backgrounds: [
        "결혼 10년 차 배우자의 잦은 야근과 주말 골프 모임이 의심됨. 차량 내 블랙박스 영상이 주기적으로 삭제되는 상황.",
        "배우자가 세컨드 폰을 사용하는 것을 우연히 목격함. 이후 생활비 지출 내역이 불투명하고 대화가 단절됨.",
        "결혼을 앞둔 예비 배우자의 과거 이력과 재정 상태에 대한 의구심이 들어 확인을 요청함."
      ],
      solutions: [
        "차량 이동 경로 분석 및 2인 1조 현장 잠복근무 실시. 숙박업소 출입 및 상간자와의 신체 접촉 장면 확보(법적 허용 범위 내).",
        "상간자의 주거지 및 근무지 파악, 실명 및 연락처 확보하여 위자료 청구 소송의 피고 특정.",
        "SNS 및 오픈소스 정보(OSINT)를 활용하여 대상자의 과거 행적과 교우 관계를 교차 검증."
      ],
      outcomes: [
        "부정행위의 결정적 증거(사진, 영상) 5건 확보. 이혼 소송에서 의뢰인에게 전적으로 유리한 조정 성립.",
        "상간자 위자료 청구 소송 승소 및 재산 분할 비율 7:3 달성. 양육권 확보 성공.",
        "예비 배우자의 심각한 채무 불이행 및 전과 사실 확인. 의뢰인이 파혼을 결정하여 더 큰 불행을 예방함."
      ],
      notes: [
        "의뢰인의 감정이 격해져 돌발 행동을 하지 않도록 심리적 안정을 유도하는 것이 중요했습니다. 차분한 대응이 승소의 열쇠였습니다.",
        "상대방이 매우 용의주도하여 미행을 눈치챌 뻔했으나, 차량을 3번 교체하며 추적한 끝에 증거를 잡았습니다.",
        "단순한 외도 조사를 넘어, 상간자가 의뢰인의 지인이라는 충격적 사실까지 밝혀내어 완벽한 관계 정리를 도왔습니다."
      ],
      phases: [
        { name: "기초 정보 분석", duration: 2, deliverables: ["대상자 프로필", "주요 동선 파악"] },
        { name: "현장 채증 활동", duration: 7, deliverables: ["증거 사진/영상", "출입 기록"] },
        { name: "신원 특정 및 조회", duration: 3, deliverables: ["상간자 인적사항", "재산 조회 결과"] },
        { name: "보고서 작성", duration: 2, deliverables: ["소송용 입증 자료", "종합 보고서"] }
      ]
    },
    'missing_person': {
      items: ['장기 실종자', '가출 청소년', '채무 도피자', '옛 은인 찾기'],
      backgrounds: [
        "치매를 앓고 있는 70대 노부모가 집을 나간 후 48시간째 연락 두절. 골든타임이 얼마 남지 않은 긴급 상황.",
        "수억 원의 계주가 곗돈을 들고 야반도주함. 휴대폰은 꺼져 있고 연고지와 모든 연락을 끊고 잠적.",
        "20년 전 헤어진 친형제와 연락이 닿기를 희망함. 남아있는 정보는 오래된 주소와 사진 한 장뿐임."
      ],
      solutions: [
        "실종 지점 주변 CCTV 50여 개소 정밀 판독 및 탐문 수사. 대중교통 이용 기록 조회.",
        "도피자의 은닉 차량 번호판 수배 시스템 등록(LIRA 파트너십) 및 신용카드 사용 패턴이 아닌 '포인트 적립' 등 사소한 흔적 추적.",
        "과거 주소지의 폐쇄 등기부 등본 역추적 및 동네 원로 주민 탐문. 행정기관 협조 공문 발송(합법적 절차)."
      ],
      outcomes: [
        "실종 72시간 만에 인근 야산에서 탈진 상태의 대상자 발견 및 구조. 병원 이송 조치.",
        "지방 소도시 낚시터에 은신 중이던 채무자 소재 파악. 채권단과 동행하여 지불 각서 징구 성공.",
        "부산에 거주 중인 형제와의 극적인 상봉 주선. 20년 만의 가족 재회 성사."
      ],
      notes: [
        "경찰 수사가 난항을 겪던 건이었으나, 민간 조사의 기동성과 끈질긴 CCTV 분석으로 실종자의 이동 경로를 찾아냈습니다.",
        "도피자는 핸드폰을 껐지만, 반려견 진료 기록이라는 의외의 단서에서 꼬리가 잡혔습니다. 디테일이 승부를 갈랐습니다.",
        "단순 소재 파악을 넘어, 양측의 만남 의사를 조심스럽게 타진하여 감동적인 재회까지 이끌어낸 보람찬 사건이었습니다."
      ],
      phases: [
        { name: "단서 수집 및 분석", duration: 3, deliverables: ["예상 이동 경로도", "탐문 기록지"] },
        { name: "현장 수색 및 추적", duration: 10, deliverables: ["탐색 구역 지도", "목격자 진술서"] },
        { name: "소재 파악 및 접촉", duration: 5, deliverables: ["소재지 확인 사진", "대상자 상태 보고"] },
        { name: "가족 인계/종결", duration: 1, deliverables: ["인계 확인서", "종결 보고서"] }
      ]
    }
  };

  const regions = ['서울 Gangnam', '부산 Haeundae', '인천 Songdo', '경기 Pangyo', '제주 Jeju City', '대전 Yuseong', '대구 Suseong'];
  
  const totalScenariosToCreate = 1000;
  const batchSize = 50;
  const blueprintKeys = Object.keys(blueprints);

  for(let i = 0; i < totalScenariosToCreate; i+= batchSize) {
     const batch = [];
     for(let j = 0; j < batchSize; j++) {
        if(i + j >= totalScenariosToCreate) break;
        
        // Randomly select a blueprint
        const bpKey = blueprintKeys[Math.floor(Math.random() * blueprintKeys.length)];
        const bp = blueprints[bpKey];
        
        const subType = bp.items[Math.floor(Math.random() * bp.items.length)];
        const region = regions[Math.floor(Math.random() * regions.length)];
        const difficulty = Math.random() > 0.7 ? '상' : (Math.random() > 0.4 ? '중' : '하');
        
        // Duration variance
        const baseDuration = bp.phases.reduce((acc: number, p: any) => acc + p.duration, 0);
        const durationVariance = Math.floor(Math.random() * 10) - 5; // +/- 5 days
        const totalDuration = baseDuration + durationVariance;

        const title = `[${subType}] ${region} ${i+j+1}호 사건 해결`;
        
        // Rich content selection
        const background = bp.backgrounds[Math.floor(Math.random() * bp.backgrounds.length)];
        const solution = bp.solutions[Math.floor(Math.random() * bp.solutions.length)];
        const outcome = bp.outcomes[Math.floor(Math.random() * bp.outcomes.length)];
        const note = bp.notes[Math.floor(Math.random() * bp.notes.length)];

        // Phase generation based on blueprint
        const phasesCreate = bp.phases.map((p: any, idx: number) => ({
            phaseKey: `P${idx+1}`,
            name: p.name,
            durationDays: p.duration + (Math.random() > 0.5 ? 1 : 0), // Slight variance
            scheduleOffset: bp.phases.slice(0, idx).reduce((acc: number, prev: any) => acc + prev.duration, 0),
            budget: {},
            phaseKPI: {},
            deliverables: p.deliverables
        }));

        batch.push(
           prisma.scenario.create({
             data: {
               title: title,
               description: overviewSummary(subType, outcome), // Helper function idea, but simplified here
               difficulty: difficulty,
               overview: {
                 caseType: bpKey.toUpperCase(),
                 objective: `${subType} 의혹 해소 및 증거 확보`,
                 background: background,
                 solution: solution,
                 outcome: outcome,
                 investigatorNote: note,
                 totalDurationDays: totalDuration
               },
               spendTracking: {},
               raciMatrix: {},
               scheduleTemplate: {},
               phases: {
                 create: phasesCreate
               }
             }
           })
        );
     }
     await prisma.$transaction(batch);
     console.log(`[MariaDB Seed] Created scenarios batch ${i} ~ ${i + batchSize}`);
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

function overviewSummary(subType: string, outcome: string): string {
    const shortOutcome = outcome.split('.')[0];
    return `${subType} 건에 대하여 ${shortOutcome}를 달성한 사례입니다.`;
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
