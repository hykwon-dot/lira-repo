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
      items: ['자금 횡령 조사', '회계 부정 감사', '법인카드 오남용', '비자금 조성 추적'],
      stories: [
        {
          background: "사내 익명 게시판을 통해 회계팀장의 자금 유용 의혹이 제기됨. 재무제표 상 특정 거래처와의 반복적 현금 흐름이 이상 징후로 포착되었으나, 증빙 서류는 완벽하게 조작되어 있어 통상적인 감사로는 적발이 불가능한 상황.",
          solution: "디지털 포렌식 전문가를 투입하여 삭제된 이면 장부 파일을 복원하고, 법인카드 사용 시간대와 개인 휴대폰 기지국 위치 정보를 대조분석함. 또한 거래처 대표와의 사적인 관계를 입증하기 위해 SNS 분석 및 평판 조회를 병행함.",
          outcome: "총 35억 원 규모의 횡령 사실을 입증하 고, 은닉된 차명 계좌 3개를 찾아내어 전액 환수 조치를 위한 가압류 신청 완료. 관련자 3명 전원 형사 고발 및 징계 해고.",
          note: "초기 보안 유지가 핵심이었습니다. 내부 감사팀과 극비리에 협력하여 증거가 인멸되기 전 심야 시간에 서버 데이터를 미러링한 것이 결정적 승부수였습니다."
        },
        {
          background: "해외 지사 설립 과정에서 승인되지 않은 거액의 자금이 페이퍼 컴퍼니로 송금된 정황이 이사회 감사를 통해 포착됨. 해당 자금은 현지 로비 자금으로 둔갑하여 실소유주를 알 수 없는 계좌로 분산 이체됨.",
          solution: "해외 현지 파트너 탐정사와 공조하여 페이퍼 컴퍼니의 등기부 임원 내역을 역추적함. 동시에 본사 담당 임원의 개인 이메일 아카이빙 데이터를 검색하여 이면 계약서 초안을 확보.",
          outcome: "비자금 조성 루트의 전체 구조도를 완성하고, 실소유주가 본사 임원임을 밝혀냄. 이사회 긴급 보고 후 해당 임원 해임 및 민사 소송 승소로 자금 회수 절차 돌입.",
          note: "국경을 넘나드는 자금 추적이었기에 현지 법률 전문가의 조력이 필수적이었습니다. 복잡한 자금 세탁 과정을 도식화하여 경영진을 설득했습니다."
        },
        {
          background: "퇴사한 전직 임원이 경쟁사로 이직하면서 회사의 기밀 영업 리스트와 입찰 예정 단가표를 빼돌린 정황이 포착됨. 이로 인해 최근 3건의 대형 입찰에서 연이어 탈락하며 막대한 손실 발생.",
          solution: "퇴사 전 3개월간의 PC 로그 및 문서 출력 기록을 전수 조사하고, 개인 클라우드 업로드 패턴을 분석. 경쟁사 이직 후 영업 활동 동선과 내부정보 활용 정황을 교차 검증.",
          outcome: "영업비밀 부정경쟁방지법 위반 증거를 확보하여 형사 입건 성공. 경쟁사에 경고장 발송 및 손해배상 청구, 재발 방지를 위한 보안 서약서 갱신.",
          note: "디지털 흔적은 거짓말을 하지 않습니다. 퇴사 직전 대량의 문서를 암호화하여 반출한 로그가 결정적인 스모킹 건이 되었습니다."
        }
      ],
      phases: [
        { 
            name: "비밀 감사 착수", 
            duration: 5, 
            deliverables: ["이상 거래 리스트", "법인카드 분석표"],
            tasks: ["ERP 접속 기록 및 회계 데이터 전수 조사", "심야/휴일 시간대 법인카드 사용처 정밀 타기팅", "주말 출근자 보안 로그 및 CCTV 대조"],
            kpi: ["이상 징후 거래 10건 이상 식별", "오탐율 0% 도전"],
            risk: "대상자가 조사 사실을 인지하고 증거 인멸 시도",
            description: "대상자 몰래 회계 시스템과 보안 기록을 교차 분석하여 횡령의 초기 증거를 확보하는 은밀한 감사 단계입니다."
        },
        { 
            name: "디지털 증거 수집", 
            duration: 10, 
            deliverables: ["서버 포렌식 결과보고서", "이메일 복구 데이터"],
            tasks: ["업무용 PC 및 저장매체 디스크 이미징", "안티 포렌식으로 삭제된 이메일 아카이브 복원", "사내 메신저 은어/암호 키워드 검색"],
            kpi: ["법적 효력 있는 스모킹 건(Smoking Gun) 확보", "데이터 무결성 유지"],
            risk: "개인정보보호법 위반 소지 및 법적 분쟁",
            description: "확보된 기기에서 삭제된 자료를 복원하고 법적 효력이 있는 형태의 디지털 증거로 가공하여 혐의를 입증합니다."
        },
        { 
            name: "자금 흐름 추적", 
            duration: 15, 
            deliverables: ["자금 추적 도표", "은닉 재산 목록"],
            tasks: ["차명 계좌 연결 고리 및 자금 세탁 경로 시각화", "은닉 부동산 등기부 열람 및 실소유주 추적", "가족 명의 분산 자산 조사"],
            kpi: ["전체 횡령액의 90% 이상 용처 규명", "최종 귀속자 특정"],
            risk: "해외 송금 및 비트코인 환전으로 인한 추적 난항",
            description: "빼돌린 자금이 어디로 흘러들어갔는지 끝까지 추적하여 환수 대상을 특정하고 자산을 동결합니다."
        },
        { 
            name: "법적 대응 준비", 
            duration: 7, 
            deliverables: ["소송 증거 자료집", "피해 규모 산정 보고서"],
            tasks: ["법무팀과 증거 목록 교차 검증", "고소장 작성을 위한 사실 관계 논리 구성", "부동산 및 계좌 가압류 신청 서류 준비"],
            kpi: ["고소장 접수 및 사건 번호 발부", "보전 처분 인용 결정"],
            risk: "상대방의 역고소 및 허위 진술 가능성",
            description: "수집된 모든 증거를 법리적으로 재구성하여 형사 고소 및 민사 소송을 완벽하게 준비하는 마무리 단계입니다."
        }
      ]
    },
    'industrial_espionage': {
      items: ['기술 유출 적발', '설계도면 유출 차단', '핵심인력 전직 금지', '경쟁사 매수 수사'],
      stories: [
        {
          background: "수년간 100억 원을 투자해 개발한 신제품 출시를 앞두고, 경쟁사가 유사한 특허를 기습 출원함. 내부 개발팀 핵심 연구원 2명이 최근 잦은 연차를 사용하고 보안 구역 출입 패턴이 비정상적임.",
          solution: "연구소 보안 구역 내 CCTV와 출입 로그를 초 단위로 분석하여 비인가 저장매체 반입 정황을 포착. 네트워크 패킷 스니핑을 통해 외부 클라우드로의 암호화된 파일 전송 로그를 확보.",
          outcome: "공항에서 해외로 출국하려던 용의자를 수사기관과 공조하여 긴급 체포하고 노트북 압수. 유출된 기술의 100% 회수 및 경쟁사 대상 특허 무효 소송 승소.",
          note: "기술 유출 사건은 골든타임 확보가 생명입니다. 출국 2시간 전 공항경찰대와 핫라인을 통해 신병을 확보한 것이 신의 한 수였습니다."
        },
        {
          background: "협력업체 직원이 유지보수 권한을 악용하여 주력 제품의 설계 도면 전체를 다운로드 받은 로그가 발견됨. 해당 직원은 이미 퇴사 후 잠적하였으며, 브로커를 통해 제3국 기업에 매각을 시도 중인 첩보 입수.",
          solution: "퇴사자의 SNS 및 지인 탐문을 통해 은신처를 파악하고, 위장 거래를 시도하여 매각 현장을 덮치는 함정 수사 기법 활용(사법기관 공조). 도면 파일의 디지털 워터마크를 추적.",
          outcome: "매각 현장에서 브로커와 주범 동시 검거. 유출된 도면 전량 폐기 및 산업기술보호법 위반으로 구속 수사 진행. 협력업체 보안 감사 강화.",
          note: "단순 로그 분석을 넘어 실제 브로커와의 접촉을 유도하는 과감한 전략이 주효했습니다. 디지털 워터마크 기술이 범인 특정에 결정적이었습니다."
        },
        {
          background: "회사의 차세대 프로젝트 리더가 경쟁사의 임원급으로 스카우트 제의를 받고 이직을 준비 중이라는 소문이 돔. 단순 이직이 아닌 프로젝트 핵심 소스코드와 인력을 통째로 빼가려는 정황 포착.",
          solution: "업무용 메신저 및 이메일 대화 내용을 키워드 분석하여 포섭 정황 포착. 경쟁사 인사 담당자와의 미팅 현장 채증 및 전직 금지 약정 위반 사실 내용증명 발송.",
          outcome: "법원으로부터 전직 금지 가처분 신청 인용 결정. 핵심 인력 3명의 잔류 설득 성공 및 프로젝트 정상화. 경쟁사에 대한 강력한 경고 조치 완료.",
          note: "사후 처벌보다는 사전 예방에 초점을 맞춘 사건이었습니다. 법적 조치와 더불어 인적 자원 관리 차원에서의 설득이 병행되어 피해를 막았습니다."
        }
      ],
      phases: [
        { 
            name: "보안 로그 정밀 분석", 
            duration: 3, 
            deliverables: ["이상 징후 분석 보고서", "데이터 유출 의심 리스트"],
            tasks: ["VPN 우회 및 비인가 IP 접속 기록 추적", "대용량 압축 파일 생성 및 전송 로그 전수 조사", "물리적 출입 통제 시스템(Gate) 기록 대조"],
            kpi: ["유출 의심 시점 및 IP 특정", "내부 공모자 식별"],
            risk: "로그 보존 기간 만료로 인한 증거 소실",
            description: "침해 사고의 흔적을 샅샅이 뒤져 유출 경로와 시점을 특정하고 용의자를 압축하는 초기 분석 단계입니다."
        },
        { 
            name: "용의자 밀착 감시", 
            duration: 7, 
            deliverables: ["동선 및 접촉자 보고서", "통신 내역 분석"],
            tasks: ["퇴근 후 주요 동선 잠복 및 채증", "경쟁사 관계자/브로커와의 비밀 회동 포착", "SNS 및 커뮤니티 활동 모니터링"],
            kpi: ["접선 현장 고화질 사진 확보", "유출 경로 실물 확인"],
            risk: "미행 발각 시 용의자 잠적 및 증거 인멸",
            description: "용의자의 오프라인 동선을 추적하여 실제 경쟁사나 브로커와 접촉하는 결정적인 장면을 포착합니다."
        },
        { 
            name: "유출 경로 차단/검거", 
            duration: 5, 
            deliverables: ["네트워크 차단 조치 결과", "피의자 검거 현황"],
            tasks: ["계정 접근 권한 즉시 동결 및 원격 로그아웃", "유출 파일 원격 삭제 명령 실행", "수사 기관 공조 하에 현장 압수수색"],
            kpi: ["기술 자료 외부 유출 0건 방어", "용의자 신병 안전 확보"],
            risk: "랜섬웨어 유포 등 보복성 사이버 공격",
            description: "확인된 모든 유출 경로를 기술적/물리적으로 차단하고, 수사기관과 협력하여 용의자를 제압합니다."
        },
        { 
            name: "피해 복구 및 보안 강화", 
            duration: 10, 
            deliverables: ["피해 가치 평가서", "재발 방지 마스터플랜"],
            tasks: ["유출 시도 기술의 경제적 가치 산정", "보안 취약점 패치 및 DLP 정책 강화", "전 임직원 대상 보안 서약서 갱신 및 교육"],
            kpi: ["재발 방지 시스템 100% 구축", "명확한 피해액 산출"],
            risk: "기업 신뢰도 하락 및 주가 영향",
            description: "사건 종결 후, 무너진 보안 체계를 재건하고 피해 규모를 산정하여 법적 배상을 청구합니다."
        }
      ]
    },
    'infidelity': {
      items: ['외도 증거 수집', '상간자 신원 파악', '이혼 소송 자료', '양육권 분쟁 조사'],
      stories: [
        {
          background: "결혼 10년 차 배우자가 최근 잦은 주말 골프 모임과 야근을 핑계로 귀가 시간이 늦어짐. 차량 내 블랙박스 메모리가 주기적으로 교체되거나 포맷되는 등 증거 인멸 정황이 뚜렷함.",
          solution: "대상자의 차량에 위치 추적기(동의 하에) 또는 이동 경로 분석 기법을 적용하고, 2인 1조로 24시간 교대 잠복 감시를 수행. 골프장이 아닌 인근 리조트 출입 장면을 확보.",
          outcome: "상간자와 리조트에 투숙하는 결정적 영상 및 사진 증거 10여 점 확보. 이혼 소송에서 유책 배우자임을 입증하여 재산 분할 7:3 및 양육권 확보 성공.",
          note: "의뢰인의 감정적 동요를 막고 차분하게 대응하도록 코칭한 것이 주효했습니다. 섣불리 아는 척하지 않고 끝까지 물증을 잡은 인내심이 승리 요인입니다."
        },
        {
          background: "배우자의 세컨드 폰 존재를 우연히 알게 됨. 잠김 패턴을 풀 수 없어 내용은 확인하지 못했으나, 새벽 시간대 잦은 알림과 베란다 통화가 반복되어 의뢰.",
          solution: "통신 패턴 분석 및 주요 데이트 장소로 추정되는 핫플레이스 잠복. 주말 쇼핑몰 데이트 현장에서 자연스러운 스킨십 장면과 상간자의 차량 번호를 확보.",
          outcome: "상간자의 주소지, 직장, 연락처를 모두 특정하여 위자료 청구 소송 제기. 배우자가 꼼짝 못 할 증거를 제시하여 협의 이혼을 유리하게 이끌어냄.",
          note: "상대방이 매우 치밀하여 미행을 눈치챌 뻔한 위기가 있었으나, 차량을 3번 교체하는 기지를 발휘하여 끝내 증거를 확보했습니다."
        },
        {
          background: "결혼을 앞둔 예비 신랑/신부의 과거 이력과 재정 상태가 의심스럽다는 의뢰. 상대방이 보여준 명품 과시와 사업 규모에 비해 실제 지출 내역이나 생활 수준이 맞지 않음.",
          solution: "대상자의 본가 거주지 탐문 및 실제 운영한다는 사업장 현장 실사. 등기부 등본 및 신용 상태(합법적 범위) 조회를 통해 '바지 사장'임을 확인.",
          outcome: "심각한 다중 채무와 전과 사실, 그리고 사실혼 관계의 동거인이 있음을 확인. 의뢰인이 결혼식 전 파혼을 결정하여 평생의 불행을 예방함.",
          note: "단순한 뒷조사가 아니라 한 사람의 인생을 구한다는 사명감으로 임했습니다. 충격적인 사실이었지만 가감 없이 보고하여 올바른 판단을 도왔습니다."
        }
      ],
      phases: [
        { 
            name: "기초 정보 수집", 
            duration: 2, 
            deliverables: ["대상자 생활 리포트", "의심 동선 지도"],
            tasks: ["SNS 및 메신저 프로필 변동 이력 분석", "차량 블랙박스 음성/영상 정밀 복원", "평소 생활 패턴 및 타임라인 도식화"],
            kpi: ["부정행위 의심 시간대 특정", "주요 이동 수단 파악"],
            risk: "의뢰인의 돌발 행동으로 인한 보안 누설",
            description: "조사의 기초가 되는 단계로, 의뢰인의 진술과 기초 자료를 바탕으로 대상자의 허점을 파고들 전략을 수립합니다."
        },
        { 
            name: "현장 잠복 및 채증", 
            duration: 7, 
            deliverables: ["고화질 증거 사진/영상", "숙박업소 출입 기록"],
            tasks: ["24시간 밀착 동행 감시 (2인 1조)", "모텔/호텔 등 숙박업소 진출입 장면 촬영", "차량 내외부 대화 내용 녹취(법적 허용 시)"],
            kpi: ["부인할 수 없는 결정적 증거 3건", "영상 증거 확보"],
            risk: "스토킹 처벌법 저촉 주의",
            description: "가장 중요한 실행 단계로, 법적 효력이 있는 부정행위의 결정적 증거를 현장에서 직접 확보합니다."
        },
        { 
            name: "상간자 신원 특정", 
            duration: 3, 
            deliverables: ["상간자 인적사항 보고서", "재산/직업 조회 결과"],
            tasks: ["채증된 차량 번호판 조회를 통한 차주 상세 파악", "거주지 등기부 등본 열람 및 실거주 확인", "근무지 방문 및 직위 파악"],
            kpi: ["소장에 기재할 실명/주소 확보", "재직 증명 확인"],
            risk: "개인정보보호법 위반 및 무단 침입 금지",
            description: "위자료 청구 소송의 피고가 될 상간자의 정확한 신원을 파악하여 소송 가능 여부를 타진합니다."
        },
        { 
            name: "결과 보고 및 자문", 
            duration: 2, 
            deliverables: ["종합 조사 보고서", "변호사 검토 의견서"],
            tasks: ["일자별 행동 요약 및 증거물 체계적 정리", "법적 쟁점 검토 및 전문 변호사 연계", "의뢰인 카운슬링 및 향후 대처 가이드"],
            kpi: ["의뢰인 최종 승인", "증거 능력 100% 인정"],
            risk: "조사 내용의 제3자 유출",
            description: "모든 조사 결과를 종합하여 보고서를 작성하고, 의뢰인이 최선의 법적 판단을 내릴 수 있도록 지원합니다."
        }
      ]
    },
    'missing_person': {
      items: ['장기 실종자 찾기', '가출 청소년 소재 파악', '악성 채무자 추적', '첫사랑/은인 찾기'],
      stories: [
        {
          background: "치매를 앓고 있는 70대 노부모가 산책을 나간 후 48시간째 귀가하지 않음. 경찰 신고는 마쳤으나 수색 범위가 너무 넓어 난항을 겪고 있으며, 기온 급강하로 생명이 위독한 상황.",
          solution: "실종 지점 반경 5km 내의 민간 CCTV와 차량 블랙박스 영상을 전수 확보하여 분석. 드론 수색팀을 투입하여 사람이 접근하기 힘든 야산과 하천변을 정밀 수색.",
          outcome: "실종 72시간 만에 인근 야산 8부 능선 바위 뒤편에서 탈진 상태의 대상자 발견. 응급 헬기 이송으로 생명을 구하고 가족에게 안전하게 인계.",
          note: "경찰 인력만으로는 한계가 있던 수색을 드론과 첨단 장비로 보완하여 골든타임을 지켜냈습니다. 조금만 늦었어도 큰일 날 뻔했습니다."
        },
        {
          background: "지인들에게 수억 원의 곗돈을 사기 치고 야반도주한 계주를 추적. 휴대폰은 대포폰으로 교체되었고, 연고지와 모든 연락을 끊고 잠적하여 경찰 수사도 답보 상태.",
          solution: "가족 명의의 신용카드 사용 내역이 아닌 '멤버십 포인트 적립', '주차 앱 로그인' 등 사소한 디지털 흔적을 끈질기게 추적. 배달 앱 주문 패턴을 분석하여 은신처 지역을 좁힘.",
          outcome: "지방 소도시의 낡은 빌라에 은신 중이던 채무자를 찾아내어 채권단과 함께 현장 급습. 지불 각서 징구 및 은닉 현금 5천만 원 회수.",
          note: "대포폰을 쓰더라도 배달 음식은 시켜 먹는다는 인간의 습성을 이용했습니다. 사소한 데이터 조각들을 모아 퍼즐을 완성한 쾌거입니다."
        },
        {
          background: "30년 전 헤어진 친형제와 다시 만나고 싶다는 60대 의뢰인의 간절한 요청. 남아있는 것은 빛바랜 흑백 사진 한 장과 재개발로 사라진 옛 주소지뿐.",
          solution: "폐쇄 등기부 등본을 1970년대까지 역추적하여 당시 이웃 주민들을 수소문. 구청 및 행정복지센터의 '헤어진 가족 찾기' 서비스와 연계하여 제한적 열람 시도.",
          outcome: "수소문 끝에 부산에 거주 중인 동생의 연락처를 확보. 조심스러운 중재 끝에 서울역에서의 눈물겨운 상봉 주선 성공.",
          note: "단순한 정보 찾기가 아니라, 오랜 세월 단절된 가족의 끈을 다시 잇는 감동적인 작업이었습니다. 탐정으로서 최고의 보람을 느꼈습니다."
        }
      ],
      phases: [
        { 
            name: "단서 발굴 및 프로파일링", 
            duration: 3, 
            deliverables: ["예상 이동 경로 시뮬레이션", "탐문 수사 기록"],
            tasks: ["최후 목격지 반경 CCTV 50개소 확보/분석", "주변인 심층 인터뷰를 통한 행선지 추론", "휴대폰 기지국 및 교통카드 데이터 분석 요청"],
            kpi: ["초기 이동 방향 정확도 90%", "유효 제보 확보"],
            risk: "초기 골든타임 경과로 인한 생존 확률 저하",
            description: "실종/도주 발생 초기, 가능한 모든 수단을 동원하여 대상자의 흔적과 이동 방향을 과학적으로 찾아냅니다."
        },
        { 
            name: "정밀 수색 및 추적", 
            duration: 10, 
            deliverables: ["수색 구역 정밀 지도", "목격자 진술서"],
            tasks: ["예상 은신처/발견 지점 현장 탐문 수색", "온/오프라인 전단지 배포 및 제보 접수", "열화상 드론 활용 광범위 지역 항공 수색"],
            kpi: ["탐색 대상 구역 100% 커버", "결정적 목격자 확보"],
            risk: "악천후 및 지형 험난으로 인한 수색 지연",
            description: "분석된 경로 데이터를 바탕으로 현장에 전문 인력과 장비를 투입하여 물샐틈없는 수색/추적 작전을 펼칩니다."
        },
        { 
            name: "소재 파악 및 신병 확보", 
            duration: 5, 
            deliverables: ["현장 확인 사진", "대상자 상태 리포트"],
            tasks: ["은신처 잠복 및 대상자 신원 최종 확인", "대상자 신병 안전 확보 및 우발 상황 통제", "법적 테두리 내에서의 동행 요구"],
            kpi: ["대상자 신원 100% 일치", "돌발 상황 제로"],
            risk: "대상자의 도주 시도 또는 격렬한 저항",
            description: "대상자의 정확한 위치를 특정한 후, 안전하게 신병을 확보하거나 의뢰인과의 접촉을 시도합니다."
        },
        { 
            name: "종결 및 사후 관리", 
            duration: 1, 
            deliverables: ["인계 확인서", "최종 종결 보고서"],
            tasks: ["가족 상봉 주선 및 귀가 동행", "병원 이송, 채권 회수 등 후속 조치 지원", "사건 종결 행정 처리 및 만족도 조사"],
            kpi: ["안전한 인계 완료", "의뢰인 감동 후기 획득"],
            risk: "재발(가출/도주) 가능성",
            description: "대상자를 가족의 품으로 돌려보내거나 의뢰 목적을 달성하게 하고, 사건을 훈훈하게 마무리합니다."
        }
      ]
    }
  };


  const regions = ['서울 강남', '부산 해운대', '인천 송도', '경기 판교', '제주 제주시', '대전 유성', '대구 수성', '광주 상무', '울산 삼산', '세종 나성'];
  
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
        
        // Rich content selection (Coherent Story)
        const story = bp.stories[Math.floor(Math.random() * bp.stories.length)];
        const background = story.background;
        const solution = story.solution;
        const outcome = story.outcome;
        const note = story.note;

        // Phase generation based on blueprint
        const phasesCreate = bp.phases.map((p: any, idx: number) => ({
            phaseKey: `P${idx+1}`,
            name: p.name,
            durationDays: p.duration + (Math.random() > 0.5 ? 1 : 0), // Slight variance
            scheduleOffset: bp.phases.slice(0, idx).reduce((acc: number, prev: any) => acc + prev.duration, 0),
            description: p.description, // Added description for rich phase UI
            budget: {},
            phaseKPI: p.kpi ?? [],
            deliverables: p.deliverables,
            tasks: {
               create: (p.tasks || []).map((t: string, taskIdx: number) => ({
                 taskKey: `T${taskIdx+1}`,
                 desc: t,
                 competency: {},
                 durationDays: null,
                 priority: "HIGH",
                 status: "PENDING",
                 order: taskIdx
               }))
            },
            risks: {
               create: p.risk ? [{
                 riskKey: `R${idx+1}`,
                 name: p.risk,
                 severity: "MEDIUM",
                 trigger: "상황 발생 시",
                 mitigation: "사전 대응 메뉴얼 준수"
               }] : []
            }
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
