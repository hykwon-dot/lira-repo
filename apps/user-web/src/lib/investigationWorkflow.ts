export const CASE_STATUS_META = {
  MATCHING: {
    label: "사건 요청",
    description: "민간조사원에게 사건을 의뢰한 상태입니다.",
    badge: "bg-slate-100 text-slate-700 border border-slate-200",
  },
  ACCEPTED: {
    label: "수락됨",
    description: "민간조사원이 사건을 수락했습니다. 작업 시작을 준비하세요.",
    badge: "bg-sky-100 text-sky-700 border border-sky-200",
  },
  IN_PROGRESS: {
    label: "진행 중",
    description: "사건이 수행되고 있습니다.",
    badge: "bg-indigo-100 text-indigo-700 border border-indigo-200",
  },
  REPORTING: {
    label: "사건 보고",
    description: "최종 결과 보고가 준비 중입니다.",
    badge: "bg-violet-100 text-violet-700 border border-violet-200",
  },
  COMPLETED: {
    label: "완료",
    description: "사건이 종료되었습니다.",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  DECLINED: {
    label: "거절됨",
    description: "민간조사원이 사건을 진행하지 않기로 했습니다.",
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
  },
  CANCELLED: {
    label: "취소됨",
    description: "고객 또는 시스템에서 사건을 취소했습니다.",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
  },
} as const;

export type CaseStatusKey = keyof typeof CASE_STATUS_META;

export const CASE_STATUS_SEQUENCE: CaseStatusKey[] = [
  "MATCHING",
  "ACCEPTED",
  "IN_PROGRESS",
  "REPORTING",
  "COMPLETED",
];

export const TIMELINE_TYPE_LABEL: Record<string, { label: string; tone: string }> = {
  REQUEST_CREATED: { label: "사건 의뢰", tone: "text-slate-600" },
  INVESTIGATOR_ASSIGNED: { label: "지정된 민간조사원", tone: "text-slate-600" },
  INVESTIGATOR_ACCEPTED: { label: "수락", tone: "text-sky-600" },
  INVESTIGATOR_DECLINED: { label: "거절", tone: "text-rose-600" },
  STATUS_ADVANCED: { label: "상태 변경", tone: "text-indigo-600" },
  PROGRESS_NOTE: { label: "진행 메모", tone: "text-slate-600" },
  INTERIM_REPORT: { label: "중간 보고", tone: "text-emerald-600" },
  FINAL_REPORT: { label: "최종 보고", tone: "text-indigo-700" },
  ATTACHMENT_SHARED: { label: "자료 공유", tone: "text-sky-600" },
  CUSTOMER_CANCELLED: { label: "취소", tone: "text-amber-600" },
  SYSTEM: { label: "시스템", tone: "text-slate-500" },
};
