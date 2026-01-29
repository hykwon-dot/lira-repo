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
            name: "1. 비밀 감사 착수 (Secret Audit)", 
            duration: 5, 
            deliverables: ["ERP_Access_Log_2024.xlsx", "Corporate_Card_Anomaly_Report.pdf", "Suspect_Activity_Timeline_v1.docs"],
            tasks: ["ERP 접속 기록 3개월치(10월~12월) 전수 조사 및 비업무 시간대 접속 로그 추출", "심야(23:00~04:00) 및 주말 법인카드 결제 내역과 실제 업무 수행 여부 크로스 체크", "보안팀 협조 하에 용의자 차량 출입 기록 및 주말 사내 동선 CCTV 확보"],
            kpi: ["소명 불가능한 이상 거래 10건 이상 식별", "오탐율 0% (법적 증거 능력 확보)"],
            risk: "대상자가 조사 낌새를 눈치채고 증거 인멸 시도 (PC 포맷 등)",
            description: "대상자에게 노출되지 않도록 보안을 유지하며, 회계 시스템 로그와 물리적 보안 기록을 교차 분석하여 횡령의 '스모킹 건'을 포착하는 단계입니다."
        },
        { 
            name: "2. 디지털 증거 수집 (Forensics)", 
            duration: 10, 
            deliverables: ["Forensic_Image_Hash_Report.pdf", "Restored_Email_Archive.pst", "Telegram_Chat_Logs.txt"],
            tasks: ["법무팀 입회 하에 업무용 노트북(ThinkPad X1) 및 외장하드 비트스트림 이미지 사본 생성", "안티 포렌식 툴로 완전 삭제된 이메일 아카이브 파일(.ost) 정밀 복원 시도", "사내 메신저 로그에서 '리베이트', '상품권', '현금화' 등 은어 키워드 검색"],
            kpi: ["법원 제출용 해시값 무결성 입증", "결정적 공모 대화록 확보"],
            risk: "개인정보보호법 위반 소지 (개인 용도 파일 열람 금지 원칙 준수)",
            description: "확보된 기기에서 삭제된 자료를 기술적으로 복원하고, 법정에서 부인할 수 없는 객관적 데이터 형태의 디지털 증거를 확보합니다."
        },
        { 
            name: "3. 자금 흐름 추적 (Money Trace)", 
            duration: 15, 
            deliverables: ["Money_Laundering_Flowchart.pptx", "Hidden_Assets_List.xlsx", "Family_Account_Tracing.pdf"],
            tasks: ["차명 계좌로 의심되는 5개 계좌의 입출금 내역 패턴 분석 및 자금 세탁 경로 시각화", "은닉 부동산(강남구 논현동 빌라) 등기부 열람 및 실소유주 관계망 분석", "직계 가족 및 친인척 명의로 분산 이체된 자금 흐름 2차 추적"],
            kpi: ["횡령액 35억 원의 95% 이상 용처 규명", "최종 자금 귀속자 특정"],
            risk: "해외 송금 및 가상화폐(USDT) 환전으로 인한 추적 단절",
            description: "횡령한 자금이 어디를 거쳐 최종적으로 누구에게 흘러들어갔는지 자금 흐름의 전체 지도를 완성하고 환수 대상을 특정합니다."
        },
        { 
            name: "4. 법적 대응 및 환수 (Legal Action)", 
            duration: 7, 
            deliverables: ["Evidence_Package_Unit_1.zip", "Damage_Assessment_Report.pdf", "Legal_Advice_Memo.docx"],
            tasks: ["법무법인 태평양 담당 변호사와 증거 목록 검토 및 입증 논리 보강", "특정경제범죄 가중처벌 등에 관한 법률 위반(횡령) 고소장 초안 작성 지원", "파악된 은닉 부동산 및 예금 채권에 대한 가압류 신청 서류 즉시 접수"],
            kpi: ["고소장 접수 3일 내 피의자 소환", "보전 처분 인용율 100%"],
            risk: "피의자의 대형 로펌 선임 및 역고소(무고/명예훼손) 가능성",
            description: "수집된 모든 증거를 형사 소송법적 관점에서 재구성하여 사법 처리를 완벽하게 준비하고, 실질적인 피해 회복을 위한 가압류를 실행합니다."
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
            name: "1. 보안 로그 정밀 분석 (Log Analysis)", 
            duration: 3, 
            deliverables: ["VPN_Access_Audit.csv", "Data_Exfiltration_Alert.html", "Suspect_Gate_Log.xlsx"],
            tasks: ["VPN 우회 접속 시도(Proxy/Tor) 및 비인가 공인 IP(중국/러시아 대역) 접속 기록 전수 추적", "DLP(Data Loss Prevention) 로그 상 1GB 이상 대용량 암호화 파일 전송 기록 필터링", "물리적 출입 통제 시스템(Gate A, 연구동) 심야 시간대(22:00~) 단독 출입자 패턴 분석"],
            kpi: ["최초 기술 유출 의심 시점 및 사용 단말(MAC Addr) 특정", "내부 공모자 2명 이상 식별"],
            risk: "로그 보존 주기(6개월) 경과로 인한 핵심 증거 소실 가능성",
            description: "사내 보안 시스템에 남겨진 수만 건의 로그 중 '이상 징후'를 찾아내어 침해 사고의 경로와 시점을 핀포인트로 특정합니다."
        },
        { 
            name: "2. 대상자 오프라인 감시 (Surveillance)", 
            duration: 7, 
            deliverables: ["Suspect_Movement_Log_Day1-7.pdf", "Meeting_Photo_Evidence.jpg", "Burner_Phone_Comm_Log.txt"],
            tasks: ["퇴근 후 주요 동선(강남역, 판교) 잠복 감시 및 경쟁사 브로커 접촉 현장 망원 촬영", "대상자가 사용하는 대포폰(Burner Phone)의 통화 패턴 및 기지국 위치 정보 분석(통신사 협조)", "SNS 비공계 계정 및 개발자 커뮤니티(GitHub, StackOverflow) 내 기술 질의 내역 모니터링"],
            kpi: ["경쟁사 기술 이사와의 접선 현장 고화질(4K) 영상 확보", "유출 대가(암호화폐/현금) 수수 정황 포착"],
            risk: "대상자가 미행을 눈치채고 잠적하거나 증거(노트북/USB) 폐기 시도",
            description: "사이버 상의 흔적을 넘어, 실제 물리적 공간에서 일어나는 경쟁사와의 접촉 및 거래 현장을 포착하여 결정적 물증을 확보합니다."
        },
        { 
            name: "3. 유출 경로 차단 및 검거 (Interdiction)", 
            duration: 5, 
            deliverables: ["Network_Block_Report.pdf", "Arrest_Scene_Footage.mp4", "Confiscated_Device_List.xls"],
            tasks: ["최고 보안 관리자 권한으로 계정 접근 권한 즉시 박탈 및 사내망 원격 접속 세션 강제 종료", "원격 명령(MDM)을 통해 유출된 모바일 기기 내 회사 기밀 데이터 포맷 실행", "경찰청 산업기술보호수사대와 공조하여 공항 출국장 또는 접선 현장 긴급 체포/압수수색"],
            kpi: ["핵심 기술 자료(설계도면 v2.0) 외부 유출 0건 방어 성공", "용의자 신병 안전 확보"],
            risk: "랜섬웨어 유포 등 퇴사자의 보복성 로직 밤(Logic Bomb) 실행 우려",
            description: "확인된 모든 유출 경로를 기술적, 물리적으로 즉시 차단하고 수사기관과 협력하여 용의자를 제압, 추가 피해를 막습니다."
        },
        { 
            name: "4. 피해 복구 및 재발 방지 (Recovery)", 
            duration: 10, 
            deliverables: ["Damage_Valuation_Report.docx", "Security_Masterplan_2026.pptx", "Employee_Pledge_Signed.pdf"],
            tasks: ["유출 시도된 기술의 연구개발비 및 예상 시장 손실액 기반 경제적 가치 산정(손해배상용)", "USB 포트 물리적 봉인 및 망분리 정책(VDI) 전사 확대 적용", "전 임직원 대상 산업보안 교육 실시 및 강화된 비밀유지서약서(NDA) 갱신 날인"],
            kpi: ["ISO 27001 기준 재발 방지 시스템 100% 구축", "재판부 인정 가능 피해액 산출"],
            risk: "사건 공개 시 기업 이미지 실추 및 주가 하락 (언론 통제 필요)",
            description: "사건 종결 후 무너진 보안 체계를 재건하고, 피해 규모를 정확히 산정하여 민사 소송을 통한 배상 절차를 진행합니다."
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
            name: "1. 기초 정보 정밀 분석 (Profiling)", 
            duration: 2, 
            deliverables: ["Target_Profile_Overview.pdf", "Vehicle_Blackbox_Voice_Analysis.wav", "Dating_App_Chat_Log.txt"],
            tasks: ["SNS(인스타그램, 페이스북) 부계정 탐색 및 '좋아요' 누른 인물 네트워크 분석", "차량 내 블랙박스 삭제된 음성 데이터 복원 및 동승자 대화 내용 추출", "신용카드 결제 내역(호텔, 명품)과 하이패스 기록을 대조하여 의심 장소 좁히기"],
            kpi: ["부정행위 의심 시간대(금요일 20시~) 특정", "상간자 추정 인물 후보군 3명 이내 압축"],
            risk: "의뢰인의 감정적 대응으로 인한 조사 기밀 유출",
            description: "본격적인 조사에 앞서 의뢰인이 제공한 정보와 디지털 흔적을 샅샅이 뒤져 대상자의 거짓말을 간파하고 동선을 예측합니다."
        },
        { 
            name: "2. 현장 잠복 및 채증 (Surveillance)", 
            duration: 7, 
            deliverables: ["Surveillance_Photo_Set_4K.zip", "Entry_Exit_Video_Log.mp4", "Voice_Recorder_File_01.mp3"],
            tasks: ["대상자 차량에 GPS 트래커(법적 동의 하) 부착 및 이동 경로 실시간 모니터링", "2인 1조로 24시간 교대 잠복하여 모텔/호텔 진출입 결정적 순간 고화질 촬영", "차량 내부 대화 녹취를 위해 고성능 초소형 레코더 합법적 설치 및 수거"],
            kpi: ["법정 증거로 채택 가능한 스킨십/투숙 장면 3건 확보", "상간자 얼굴 정면 사진 확보"],
            risk: "불법 주거 침입 또는 스토킹 처벌법 위반 소지 (거리 두기 필수)",
            description: "가장 중요한 실행 단계로, 법적 효력이 있는 부정행위의 결정적 증거를 현장에서 직접 확보합니다."
        },
        { 
            name: "3. 상간자 신원 특정 (Identification)", 
            duration: 3, 
            deliverables: ["Adulterer_Identity_Report.pdf", "Assets_Search_Result.xlsx", "Workplace_Visit_Photo.jpg"],
            tasks: ["채증된 상간자 차량 번호판 조회를 통한 차주 실명 및 주소지 파악(탐정 권한)", "거주지 등기부 등본 열람 및 우편물 확인을 통한 실거주 여부 교차 검증", "근무지 주차장 잠복을 통해 직업 및 직위 파악 (급여 가압류 대비)"],
            kpi: ["소장에 기재할 피고의 주민등록번호/주소 100% 특정", "송달 가능한 직장 주소 확보"],
            risk: "개인정보보호법 위반 및 무단 침입 금지",
            description: "위자료 청구 소송의 피고가 될 상간자의 정확한 신원을 파악하여 소송 가능 여부를 타진합니다."
        },
        { 
            name: "4. 결과 보고 및 자문 (Counseling)", 
            duration: 2, 
            deliverables: ["Final_Investigation_Report_vFinal.pdf", "Lawyer_Opinion_Letter.docx", "Evidence_Collection_USB.zip"],
            tasks: ["시간 순서대로 구성된 타임라인 보고서 작성 (판사가 읽기 쉽게)", "이혼 전문 변호사와 연계하여 수집된 증거의 법적 효력 검증 및 소송 전략 수립", "의뢰인 멘탈 케어 및 향후 돌발 상황(폭행 등) 대처 매뉴얼 제공"],
            kpi: ["의뢰인 최종 승인 및 만족도 5.0", "증거 능력 100% 인정"],
            risk: "조사 결과에 격분한 의뢰인의 우발적 범죄 가능성",
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
            name: "1. 초기 단서 발굴 (Initial Profiling)", 
            duration: 3, 
            deliverables: ["Last_Seen_CCTV_Frame.jpg", "Target_Movement_Prediction_Map.png", "Witness_Interview_Transcript.docx"],
            tasks: ["최후 목격지(편의점, 버스정류장) 반경 1km CCTV 및 민간 블랙박스 50여 개소 영상 확보 및 프레임 단위 분석", "대상자의 인터넷 검색 기록 및 최근 카드 결제 내역(교통카드 등)을 분석하여 이동 의도 파악", "가족/지인 심층 인터뷰를 통해 갈등 관계나 평소 언급했던 장소 등 히든 단서 도출"],
            kpi: ["실종 당일 이동 경로 및 최종 행선지 방향 95% 정확도 예측", "결정적 목격자 1명 이상 확보"],
            risk: "초기 골든타임 경과 시 생존 확률 급격 하락",
            description: "실종/도주 발생 초기, 현장에 남아있는 미세한 디지털/물리적 흔적을 신속하게 수집하여 골든타임을 사수합니다."
        },
        { 
            name: "2. 정밀 수색 및 추적 (Active Search)", 
            duration: 10, 
            deliverables: ["Drone_Search_Area_Map.pdf", "Flyer_Distribution_Photo.jpg", "Tip_Off_Summary_Log.xls"],
            tasks: ["분석된 은신 추정 지역(PC방, 찜질방, 야산 등)에 현장 요원 투입 및 탐문 수색", "열화상 카메라 탑재 드론 2기를 운용하여 사람이 접근하기 힘든 수변 및 산악 지역 정밀 스캔", "온라인(지역 맘카페, 당근마켓) 및 오프라인 전단지 배포를 통한 광범위 제보 수집 네트워크 가동"],
            kpi: ["탐색 목표 구역 100% 스캔 완료", "유효 제보 기반 은신처 포위망 형성"],
            risk: "기상 악화(우천, 폭설)로 인한 수색 작전 지연",
            description: "분석된 데이터를 바탕으로 가용 가능한 모든 인력과 장비를 투입하여 물샐틈없는 포위망을 좁혀갑니다."
        },
        { 
            name: "3. 소재 파악 및 신병 확보 (Location)", 
            duration: 5, 
            deliverables: ["Target_Confirmation_Photo.jpg", "Safety_Status_Check_Report.pdf", "Encounters_Log.txt"],
            tasks: ["특정된 은신처(빌라 201호) 잠복 감시를 통해 대상자 육안 확인 및 신원 100% 검증", "대상자의 심리 상태(극단적 선택 우려 등)를 고려한 조심스러운 접촉 시도 및 대화 유도", "필요 시 경찰 실종수사팀과 핫라인 공조하여 강제 진입 및 구조(위급 시)"],
            kpi: ["대상자 신병 안전 확보(생존 확인)", "돌발 행동 및 2차 도주 차단"],
            risk: "대상자의 극렬한 저항 또는 돌발 자해 시도",
            description: "대상자의 정확한 위치를 확인한 후, 가장 안전하고 합리적인 방법으로 신병을 확보하거나 가족과 연결합니다."
        },
        { 
            name: "4. 종결 및 사후 케어 (Case Closed)", 
            duration: 1, 
            deliverables: ["Handover_Certificate.pdf", "Final_Case_Report.pdf", "Family_Reunion_Photo.jpg"],
            tasks: ["가족과의 눈물겨운 상봉 주선 및 안전한 귀가 차량 지원", "사건 발생 원인 분석(가정 폭력, 치매 등)에 따른 전문 심리 상담 센터 또는 요양 기관 연계", "의뢰인 만족도 조사 및 사건 기록의 안전한 파기(개인정보 보호)"],
            kpi: ["안전한 인계 완료 및 가족 관계 회복 지원", "의뢰인 감사 후기 획득"],
            risk: "재발(가출/도주) 가능성 및 가정 내 불화 지속",
            description: "단순한 찾기를 넘어, 가족의 품으로 안전하게 돌려보내고 근본적인 원인을 해결할 수 있도록 돕습니다."
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
