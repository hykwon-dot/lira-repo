import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  XCircle,
} from "lucide-react";

export type TimelineMeta = {
  label: string;
  description?: string;
  icon: LucideIcon;
  tone: string;
};

export const DEFAULT_TIMELINE_META: TimelineMeta = {
  label: "상태 업데이트",
  icon: Clock,
  tone: "border-slate-200 bg-slate-100 text-slate-600",
};

export const TIMELINE_EVENT_META: Record<string, TimelineMeta> = {
  REQUEST_CREATED: {
    label: "의뢰 접수",
    description: "고객이 사건을 제출했습니다.",
    icon: MessageSquare,
    tone: "border-sky-200 bg-sky-50 text-sky-600",
  },
  INVESTIGATOR_ASSIGNED: {
    label: "민간조사원 배정",
    icon: UserCheck,
    tone: "border-indigo-200 bg-indigo-50 text-indigo-600",
  },
  INVESTIGATOR_ACCEPTED: {
    label: "조사 수락",
    icon: CheckCircle2,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  INVESTIGATOR_DECLINED: {
    label: "조사 거절",
    icon: XCircle,
    tone: "border-rose-200 bg-rose-50 text-rose-600",
  },
  STATUS_ADVANCED: {
    label: "진행 상태 업데이트",
    icon: ShieldCheck,
    tone: "border-blue-200 bg-blue-50 text-blue-600",
  },
  PROGRESS_NOTE: {
    label: "진행 메모",
    icon: FileText,
    tone: "border-amber-200 bg-amber-50 text-amber-600",
  },
  INTERIM_REPORT: {
    label: "중간 보고",
    icon: FileText,
    tone: "border-amber-200 bg-amber-50 text-amber-600",
  },
  FINAL_REPORT: {
    label: "최종 보고",
    icon: FileText,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  ATTACHMENT_SHARED: {
    label: "자료 공유",
    icon: FileText,
    tone: "border-purple-200 bg-purple-50 text-purple-600",
  },
  CUSTOMER_CANCELLED: {
    label: "고객 취소",
    icon: AlertTriangle,
    tone: "border-rose-200 bg-rose-50 text-rose-600",
  },
  SYSTEM: {
    label: "시스템 알림",
    icon: Clock,
    tone: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

export const TIMELINE_PAYLOAD_KEYS = ["summary", "completionNote", "details", "note", "message"] as const;

export function getTimelineMeta(type: string): TimelineMeta {
  return TIMELINE_EVENT_META[type] ?? DEFAULT_TIMELINE_META;
}

export function extractTimelinePayloadText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  for (const key of TIMELINE_PAYLOAD_KEYS) {
    const value = (payload as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
