export const CASE_TYPE_OPTIONS = [
  { value: 'INFIDELITY', label: '배우자/가정 이슈' },
  { value: 'MISSING_PERSON', label: '실종 및 추적' },
  { value: 'CORPORATE', label: '기업 내부 조사' },
  { value: 'DIGITAL_FORENSICS', label: '디지털 포렌식' },
  { value: 'BACKGROUND_CHECK', label: '신원 조회' },
] as const;

export const INVESTIGATOR_SPECIALTY_GROUPS = [
  {
    category: '기업·지식재산 보호',
    options: [
      {
        value: '부정경쟁 및 지적재산권 침해 조사',
        label: '부정경쟁 및 지적재산권 침해 조사',
        description: '기업의 영업 비밀 유출, 특허·상표권 침해, 제품 위조 등 부정경쟁 행위를 조사하고 증거를 확보합니다.',
      },
      {
        value: '산업 스파이 및 기술 유출 조사',
        label: '산업 스파이 및 기술 유출 조사',
        description: '핵심 기술·기밀 문서 유출 정황을 파악하고 산업 스파이 관련 증거를 수집해 기업 자산을 보호합니다.',
      },
      {
        value: '산업보안/기업 내부 감사 지원',
        label: '산업보안/기업 내부 감사 지원',
        description: '기업 내부 횡령·배임·정보 유출 등 비리 행위를 조사하고 감사팀의 리스크 진단을 지원합니다.',
      },
      {
        value: '정보 유출 및 기밀 유출 방지',
        label: '정보 유출 및 기밀 유출 방지',
        description: '정보 유출 의심 시 경위와 유출자를 파악하고 유출된 데이터 범위를 확인해 대응 전략을 제시합니다.',
      },
      {
        value: '상표권/위조품 유통 경로 조사',
        label: '상표권/위조품 유통 경로 조사',
        description: '모조품·위조품의 제조 공장, 유통 경로, 판매처를 추적해 브랜드 보호와 피해 방지를 돕습니다.',
      },
    ],
  },
  {
    category: '자산 추적 & 해외 조사',
    options: [
      {
        value: '해외 관련 정보 조사 (해외 소재 재산/인물/기업)',
        label: '해외 관련 정보 조사 (해외 소재 재산/인물/기업)',
        description: '해외 거주 인물, 해외 소재 기업, 은닉 재산 등에 대한 정보를 조사하여 글로벌 자산 추적을 지원합니다.',
      },
      {
        value: '채무자 재산 파악 및 소재 추적',
        label: '채무자 재산 파악 및 소재 추적',
        description: '채무자의 부동산·차량·계좌 등 재산 목록을 확인하고 도피 여부를 추적해 회수를 돕습니다.',
      },
    ],
  },
  {
    category: '배경 및 신원 검증',
    options: [
      {
        value: '개인 신원 및 배경 조사',
        label: '개인 신원 및 배경 조사',
        description: '결혼 상대·사업 파트너·투자자 등의 학력, 경력, 재산, 평판 등을 심층 분석해 리스크를 평가합니다.',
      },
      {
        value: '기업/개인 배경 및 신원 조사',
        label: '기업/개인 배경 및 신원 조사',
        description: '사업 파트너 및 신규 임직원 등 주요 인물·조직의 과거 이력과 숨겨진 리스크를 검증합니다.',
      },
      {
        value: '특정 인물 소재 파악',
        label: '특정 인물 소재 파악',
        description: '불완전한 단서를 토대로 인물의 정확한 주소, 연락처, 직장 등을 확인해 소송·채권 확보를 지원합니다.',
      },
    ],
  },
  {
    category: '가정·분쟁 지원',
    options: [
      {
        value: '불륜/외도 증거 수집 (부정행위 증거확보)',
        label: '불륜/외도 증거 수집 (부정행위 증거확보)',
        description: '배우자의 외도 여부와 상대방 정보를 파악하고 만남 정황을 기록해 법적 분쟁에 활용할 수 있도록 합니다.',
      },
      {
        value: '의료 사고/분쟁 사실 확인',
        label: '의료 사고/분쟁 사실 확인',
        description: '의료 사고의 경위와 관련 기록을 조사해 과실 여부 판단과 분쟁 해결에 필요한 자료를 수집합니다.',
      },
    ],
  },
  {
    category: '위협 대응 & 안전',
    options: [
      {
        value: '위협 분석 및 개인 경호/보안 지원',
        label: '위협 분석 및 개인 경호/보안 지원',
        description: '협박·스토킹 등 신변 위협을 분석하고 맞춤형 경호·보안 전략을 수립해 안전을 확보합니다.',
      },
      {
        value: '스토킹 행위자 특정 및 피해 방지 조력',
        label: '스토킹 행위자 특정 및 피해 방지 조력',
        description: '스토킹 행위자의 신원을 파악하고 접근 패턴을 분석해 피해자 보호 대책과 법적 대응을 지원합니다.',
      },
      {
        value: '스토킹 및 위협 행위자 신원 파악 및 대응',
        label: '스토킹 및 위협 행위자 신원 파악 및 대응',
        description: '지속적 위협 행위자의 배경을 조사하고 재발 방지를 위한 대응 전략을 마련합니다.',
      },
    ],
  },
  {
    category: '청소년 보호',
    options: [
      {
        value: '학교폭력 및 청소년 비행 사실 확인 조사',
        label: '학교폭력 및 청소년 비행 사실 확인 조사',
        description: '학교폭력 피해 사실과 가해자 정보를 수집하고 가출·약물 등 청소년 비행 여부를 조사합니다.',
      },
    ],
  },
] as const;

export const INVESTIGATOR_SPECIALTIES = INVESTIGATOR_SPECIALTY_GROUPS.flatMap((group) =>
  group.options.map(({ value, label }) => ({ value, label })),
);

export const INVESTIGATOR_REGION_OPTIONS = [
  { value: '서울특별시', label: '서울특별시' },
  { value: '경기도', label: '경기도' },
  { value: '인천광역시', label: '인천광역시' },
  { value: '강원도', label: '강원도' },
  { value: '충청북도', label: '충청북도' },
  { value: '충청남도', label: '충청남도' },
  { value: '세종특별자치시', label: '세종특별자치시' },
  { value: '대전광역시', label: '대전광역시' },
  { value: '경상북도', label: '경상북도' },
  { value: '경상남도', label: '경상남도' },
  { value: '대구광역시', label: '대구광역시' },
  { value: '울산광역시', label: '울산광역시' },
  { value: '부산광역시', label: '부산광역시' },
  { value: '전라북도', label: '전라북도' },
  { value: '전라남도', label: '전라남도' },
  { value: '광주광역시', label: '광주광역시' },
  { value: '제주특별자치도', label: '제주특별자치도' },
] as const;
