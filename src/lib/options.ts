export const CASE_TYPE_OPTIONS = [
  { value: 'INFIDELITY', label: '배우자/가정 이슈' },
  { value: 'MISSING_PERSON', label: '실종 및 추적' },
  { value: 'CORPORATE', label: '기업 내부 조사' },
  { value: 'DIGITAL_FORENSICS', label: '디지털 포렌식' },
  { value: 'BACKGROUND_CHECK', label: '신원 조회' },
] as const;

export const INVESTIGATOR_SPECIALTIES = [
  { value: 'FIELD_TAIL', label: '현장 미행/감시' },
  { value: 'DIGITAL_FORENSIC', label: '디지털 포렌식' },
  { value: 'UNDERCOVER', label: '위장 수사/잠입' },
  { value: 'LEGAL_SUPPORT', label: '법적 증거 수집' },
  { value: 'CORPORATE_RISK', label: '기업 리스크 진단' },
  { value: 'FRAUD_INVESTIGATION', label: '보험/사기 조사' },
  { value: 'MISSING_PERSON', label: '실종자 수색' },
] as const;

export const INVESTIGATOR_SPECIALTY_GROUPS = [
  {
    label: '현장 조사',
    options: [
      { value: 'FIELD_TAIL', label: '미행 및 감시', description: '대상자의 동선 파악 및 증거 수집' },
      { value: 'MISSING_PERSON', label: '실종/가출인 찾기', description: '연락 두절된 가족/지인 소재 파악' },
      { value: 'LOCATE', label: '소재 탐지', description: '채무자 등 특정인의 은신처 파악' },
    ]
  },
  {
    label: '법률/기업',
    options: [
      { value: 'LEGAL_EVIDENCE', label: '소송 증거 수집', description: '민/형사 소송에 필요한 합법적 증거 확보' },
      { value: 'CORPORATE_RISK', label: '기업 보안/횡령', description: '산업 스파이, 내부 부정행위 조사' },
      { value: 'INTEL_PROPERTY', label: '지식재산권 침해', description: '짝퉁, 모방품 유통 경로 추적' },
    ]
  },
  {
    label: '디지털/특수',
    options: [
      { value: 'DIGITAL_FORENSICS', label: '디지털 포렌식', description: '삭제된 데이터 복구 및 분석' },
      { value: 'CYBER_CRIME', label: '사이버 범죄', description: '악성 댓글, 해킹 피해 조사' },
      { value: 'BUG_SWEEP', label: '도청/몰카 탐지', description: '사무실, 차량, 자택 보안 점검' },
    ]
  },
  {
    label: '가정/개인',
    options: [
      { value: 'INFIDELITY', label: '배우자 부정행위', description: '외도 사실 확인 및 증거 수집' },
      { value: 'SCHOOL_VIOLENCE', label: '학교 폭력', description: '피해 사실 확인 및 증거 확보' },
      { value: 'STALKING', label: '스토킹 피해', description: '가해자 신원 파악 및 증거 수집' },
    ]
  }
];

export const INVESTIGATOR_REGION_OPTIONS = [
  { value: 'SEOUL', label: '서울' },
  { value: 'GYEONGGI', label: '경기' },
  { value: 'INCHEON', label: '인천' },
  { value: 'BUSAN', label: '부산' },
  { value: 'DAEGU', label: '대구' },
  { value: 'GWANGJU', label: '광주' },
  { value: 'DAEJEON', label: '대전' },
  { value: 'ULSAN', label: '울산' },
  { value: 'SEJONG', label: '세종' },
  { value: 'GANGWON', label: '강원' },
  { value: 'CHUNGBUK', label: '충북' },
  { value: 'CHUNGNAM', label: '충남' },
  { value: 'JEONBUK', label: '전북' },
  { value: 'JEONNAM', label: '전남' },
  { value: 'GYEONGBUK', label: '경북' },
  { value: 'GYEONGNAM', label: '경남' },
  { value: 'JEJU', label: '제주' },
];
