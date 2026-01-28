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
