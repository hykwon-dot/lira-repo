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
        { 
            name: "비밀 감사 착수", 
            duration: 5, 
            deliverables: ["이상 거래 리스트", "법인카드 분석표"],
            tasks: ["ERP 접속 기록 전수 조사", "심야 시간대 법인카드 사용처 확보", "주말 출근자 보안 로그 대조"],
            kpi: ["이상 징후 10건 이상 식별", "오탐율 5% 미만"],
            risk: "대상자가 인지하고 증거 인멸 시도",
            description: "대상자 몰래 회계 시스템과 보안 기록을 교차 분석하여 횡령의 초기 증거를 확보하는 단계입니다."
        },
        { 
            name: "디지털 증거 수집", 
            duration: 10, 
            deliverables: ["서버 포렌식 리포트", "이메일 복구 자료"],
            tasks: ["업무용 노트북 하드디스크 이미징", "삭제된 이메일 아카이브 복원", "메신저 대화 로그 키워드 검색"],
            kpi: ["결정적 스모킹 건(Smoking Gun) 확보", "법적 증거 능력 유지"],
            risk: "개인정보보호법 위반 소지",
            description: "확보된 기기에서 삭제된 자료를 복원하고 법적 효력이 있는 형태의 디지털 증거로 가공합니다."
        },
        { 
            name: "자금 흐름 추적", 
            duration: 15, 
            deliverables: ["계좌 추적도", "은닉 재산 목록"],
            tasks: ["차명 계좌 연결 고리 파악", "자금 세탁 경로 시각화", "은닉 부동산 등기부 열람"],
            kpi: ["횡령액의 80% 이상 용처 규명", "최종 귀속자 특정"],
            risk: "해외 송금으로 인한 추적 난항",
            description: "빼돌린 자금이 어디로 흘러들어갔는지 끝까지 추적하여 환수 대상을 특정합니다."
        },
        { 
            name: "법적 대응 준비", 
            duration: 7, 
            deliverables: ["소송 증거 책자", "피해 규모 산정서"],
            tasks: ["변호사와 증거 목록 검토", "고소장 작성을 위한 사실 관계 정리", "가압류 신청 서류 준비"],
            kpi: ["고소장 접수 완료", "보전 처분 인용"],
            risk: "역고소 가능성 대비 부족",
            description: "수집된 모든 증거를 법리적으로 재구성하여 형사 고소 및 민사 소송을 빈틈없이 준비합니다."
        }
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
        { 
            name: "보안 로그 분석", 
            duration: 3, 
            deliverables: ["접속 기록 분석서", "데이터 전송 로그"],
            tasks: ["VPN 우회 접속 기록 확인", "대용량 파일 전송 이력 스캔", "출입 통제 시스템 로그 대조"],
            kpi: ["의심 IP 특정완료", "이상 징후 패턴 발견"],
            risk: "로그 보존 기간 만료",
            description: "초기 단계로, 시스템에 남아있는 흔적을 분석하여 침해 사고의 징후를 조기에 포착합니다."
        },
        { 
            name: "대상자 모니터링", 
            duration: 7, 
            deliverables: ["동선 보고서", "통신 내용 요약"],
            tasks: ["퇴근 후 동선 잠복 미행", "경쟁사 관계자와의 회동 채증", "SNS 활동 모니터링"],
            kpi: ["접선 현장 사진 확보", "공범 확인"],
            risk: "미행 발각으로 인한 잠적",
            description: "용의자의 물리적 동선을 밀착 감시하여 실제 기술 유출이 일어나는 접선 현장을 포착합니다."
        },
        { 
            name: "유출 경로 차단", 
            duration: 5, 
            deliverables: ["네트워크 차단 조치", "현장 검거 영상"],
            tasks: ["계정 접근 권한 즉시 박탈", "유출 파일 삭제 명령", "수사 기관 공조 요청"],
            kpi: ["추가 유출 제로화", "용의자 신병 확보"],
            risk: "랜섬웨어 등 보복 공격 가능성",
            description: "확인된 유출 경로를 기술적으로 차단하고, 수사기관과 협력하여 물리적인 유출을 막습니다."
        },
        { 
            name: "피해 복구 및 인증", 
            duration: 10, 
            deliverables: ["기술 가치 평가서", "재발 방지 대책"],
            tasks: ["유출된 기술의 경제적 가치 산정", "보안 취약점 패치 및 정책 강화", "임직원 보안 서약서 갱신"],
            kpi: ["재발 방지 시스템 100% 구축", "피해액 산정 완료"],
            risk: "기업 이미지 실추 우려",
            description: "사건 종결 후, 재발 방지를 위한 보안 체계를 강화하고 피해 규모를 정확히 산정합니다."
        }
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
        { 
            name: "기초 정보 분석", 
            duration: 2, 
            deliverables: ["대상자 프로필", "주요 동선 파악"],
            tasks: ["SNS 및 메신저 프로필 분석", "차량 블랙박스 및 하이패스 기록 확보", "평소 생활 패턴 타임라인 작성"],
            kpi: ["의심 시간대 특정", "주요 이동 수단 파악"],
            risk: "배우자의 의심으로 증거 인멸",
            description: "본격적인 조사에 앞서 의뢰인이 제공한 정보를 바탕으로 대상자의 생활 패턴과 의심 구간을 좁힙니다."
        },
        { 
            name: "현장 채증 활동", 
            duration: 7, 
            deliverables: ["증거 사진/영상", "출입 기록"],
            tasks: ["24시간 밀착 감시 및 동행", "숙박업소 등 부정행위 장소 출입 채증", "차량 내외부 대화 녹취(합법적 범위)"],
            kpi: ["결정적 부정행위 증거 3건 이상", "영상 증거 확보"],
            risk: "스토킹 처벌법 위반 주의",
            description: "합법적인 테두리 내에서 현장에 잠복하여 부정행위를 입증할 수 있는 사진과 영상을 확보합니다."
        },
        { 
            name: "신원 특정 및 조회", 
            duration: 3, 
            deliverables: ["상간자 인적사항", "재산 조회 결과"],
            tasks: ["차량 번호판 조회를 통한 차주 파악", "거주지 등기부 등본 열람", "근무지 방문 확인"],
            kpi: ["실명 및 주민등록번호 특정", "송달 가능한 주소 확보"],
            risk: "개인정보 무단 조회 금지",
            description: "상간자에 대한 위자료 청구 소송을 위해 정확한 인적 사항과 거주지를 파악하는 단계입니다."
        },
        { 
            name: "보고서 작성", 
            duration: 2, 
            deliverables: ["소송용 입증 자료", "종합 보고서"],
            tasks: ["일자별 행동 요약 보고서 작성", "증거 자료 넘버링 및 설명 첨부", "변호사 자문 연계"],
            kpi: ["의뢰인 최종 승인", "증거 불충분 보완 완료"],
            risk: "내용 유출 주의",
            description: "모든 조사 내용을 종합하여 법정에서 유리하게 작용할 수 있도록 체계적인 보고서와 증거 목록을 완성합니다."
        }
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
        { 
            name: "단서 수집 및 분석", 
            duration: 3, 
            deliverables: ["예상 이동 경로도", "탐문 기록지"],
            tasks: ["최후 목격지 주변 CCTV 확보", "주변인 및 가족 심층 인터뷰", "휴대폰 기지국 위치 정보 분석 요청"],
            kpi: ["초기 이동 방향 특정", "유효 제보 1건 이상"],
            risk: "골든타임 경과 우려",
            description: "실종 발생 초기, 가능한 모든 수단을 동원하여 대상자의 흔적과 이동 방향을 찾아냅니다."
        },
        { 
            name: "현장 수색 및 추적", 
            duration: 10, 
            deliverables: ["탐색 구역 지도", "목격자 진술서"],
            tasks: ["예상 은신처 탐문 수색", "전단지 배포 및 제보 접수", "드론 활용 광범위 지역 수색"],
            kpi: ["탐색 구역 90% 이상 커버", "추가 목격자 확보"],
            risk: "기상 악화로 인한 수색 지연",
            description: "분석된 경로를 바탕으로 현장에 인력을 투입하여 광범위하고 정밀한 수색 작전을 펼칩니다."
        },
        { 
            name: "소재 파악 및 접촉", 
            duration: 5, 
            deliverables: ["소재지 확인 사진", "대상자 상태 보고"],
            tasks: ["은신처 잠복 및 확인", "대상자 신병 안전 확보", "가족/의뢰인에게 상황 전파"],
            kpi: ["대상자 신원 100% 일치 확인", "안전 상태 확인"],
            risk: "대상자의 도주 또는 저항",
            description: "대상자의 정확한 위치를 확인한 후, 안전하게 신병을 확보하거나 접촉을 시도합니다."
        },
        { 
            name: "가족 인계/종결", 
            duration: 1, 
            deliverables: ["인계 확인서", "종결 보고서"],
            tasks: ["가족과의 상봉 주선", "병원 이송 및 후속 조치 지원", "사건 종결 행정 처리"],
            kpi: ["안전한 인계 완료", "의뢰인 만족도 최상"],
            risk: "재실종 또는 돌발 상황",
            description: "대상자를 가족 품으로 안전하게 돌려보내거나 의뢰인과 만나게 해드리고 사건을 마무리합니다."
        }
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
