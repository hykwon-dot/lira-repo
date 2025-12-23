"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClipboard,
  FiCopy,
  FiFileText,
  FiInfo,
  FiLayers,
  FiMessageCircle,
  FiRefreshCcw,
} from "react-icons/fi";

import { IntakeSummary } from "./types";

interface CaseSummarySidebarProps {
  summary: IntakeSummary | null;
  conversationSummary: string | null;
  isLoading: boolean;
  isAssistantThinking: boolean;
}

const clampStyle = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: lines,
  overflow: "hidden",
});

type QuickStatAccent = "emerald" | "amber" | "slate";

interface QuickStat {
  id: string;
  label: string;
  value: number;
  accent: QuickStatAccent;
  icon: ElementType;
}

const quickStatStyles: Record<
  QuickStatAccent,
  { wrapper: string; icon: string; chip: string }
> = {
  emerald: {
    wrapper:
      "border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50 text-emerald-700",
    icon: "bg-emerald-500/10 text-emerald-500",
    chip: "text-emerald-600",
  },
  amber: {
    wrapper:
      "border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-amber-50 text-amber-700",
    icon: "bg-amber-500/10 text-amber-600",
    chip: "text-amber-600",
  },
  slate: {
    wrapper:
      "border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-slate-50 text-slate-700",
    icon: "bg-slate-500/10 text-slate-600",
    chip: "text-slate-600",
  },
};

const QuickStatCard = ({ icon: Icon, value, label, accent }: QuickStat) => {
  const tone = quickStatStyles[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`flex flex-col gap-3 rounded-3xl border px-5 py-4 shadow-sm ${tone.wrapper}`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${tone.chip}`}
      >
        {label}
      </p>
      <p className="text-2xl font-bold leading-tight text-current">{value}</p>
    </motion.div>
  );
};

type InsightTone = "emerald" | "amber" | "slate";

interface InsightPanelProps {
  icon: ElementType;
  title: string;
  description: string;
  tone: InsightTone;
  items: string[];
  emptyCopy: string;
}

const insightToneStyles: Record<
  InsightTone,
  {
    icon: string;
    badge: string;
    bullet: string;
    border: string;
  }
> = {
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600",
    badge: "border border-emerald-100 bg-emerald-50 text-emerald-600",
    bullet: "bg-emerald-500/10 text-emerald-600",
    border: "border-emerald-100",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600",
    badge: "border border-amber-100 bg-amber-50 text-amber-600",
    bullet: "bg-amber-500/10 text-amber-600",
    border: "border-amber-100",
  },
  slate: {
    icon: "bg-slate-500/10 text-slate-600",
    badge: "border border-slate-200 bg-slate-50 text-slate-600",
    bullet: "bg-slate-500/10 text-slate-600",
    border: "border-slate-200",
  },
};

const InsightPanel = ({
  icon: Icon,
  title,
  description,
  tone,
  items,
  emptyCopy,
}: InsightPanelProps) => {
  const styles = insightToneStyles[tone];
  const displayItems = items.slice(0, 6);
  const remainder = Math.max(0, items.length - displayItems.length);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`min-h-0 rounded-3xl border bg-white/98 p-6 shadow-sm ${styles.border}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${styles.icon}`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        {items.length ? (
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${styles.badge}`}
          >
            {items.length}개 항목
          </span>
        ) : null}
      </header>

      {displayItems.length ? (
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
          {displayItems.map((item, index) => (
            <li
              key={`${title}-${index}`}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
            >
              <span
                className={`mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${styles.bullet}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 break-words" style={clampStyle(4)}>
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-xs text-slate-500">
          {emptyCopy}
        </p>
      )}

      {remainder > 0 ? (
        <p className="pt-3 text-[11px] text-slate-400">
          외 {remainder}개의 항목은 진행 타임라인에서 계속 추적됩니다.
        </p>
      ) : null}
    </motion.section>
  );
};

type StatusBadge =
  | {
      label: string;
      accent: "processing" | "updating" | "ready";
    }
  | null;

const statusBadgeStyles: Record<
  NonNullable<StatusBadge>["accent"],
  { wrapper: string; icon: ElementType; iconClass?: string }
> = {
  processing: {
    wrapper:
      "border-indigo-200 bg-indigo-50/80 text-indigo-600",
    icon: FiRefreshCcw,
    iconClass: "animate-spin",
  },
  updating: {
    wrapper:
      "border-slate-200 bg-slate-50 text-slate-600",
    icon: FiRefreshCcw,
    iconClass: "animate-spin",
  },
  ready: {
    wrapper:
      "border-emerald-200 bg-emerald-50 text-emerald-600",
    icon: FiCheckCircle,
  },
};

export const CaseSummarySidebar = ({
  summary,
  conversationSummary,
  isLoading,
  isAssistantThinking,
}: CaseSummarySidebarProps) => {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  const handleCopySummary = useCallback(async () => {
    const content = conversationSummary?.trim();
    if (!content) return;

    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1500);
      return;
    }

    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch (error) {
      console.warn("[CASE_SUMMARY_COPY_ERROR]", error);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 1500);
    }
  }, [conversationSummary]);

  const placeholder = useMemo(
    () => (
      <div className="flex h-full min-h-[340px] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white/95 p-6 text-center shadow-sm">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-500">
          <FiInfo className="h-6 w-6" />
        </span>
        <div className="space-y-2 text-sm text-slate-600">
          <p className="text-base font-semibold text-slate-900">
            아직 분석할 대화가 부족해요.
          </p>
          <p className="text-xs text-slate-500">
            상담을 이어가면 사건 개요, 확인이 필요한 공백, 준비 자료가 자동으로 정리됩니다.
          </p>
        </div>
      </div>
    ),
    [],
  );

  if (!summary) {
    return placeholder;
  }

  const caseTitle = summary.caseTitle?.trim() || "사건 제목 미정";
  const objective = summary.objective?.trim();
  const conversationPreview = conversationSummary?.trim();

  const detailChips = [
    summary.caseType?.trim()
      ? { id: "type", icon: FiLayers, label: summary.caseType.trim(), tone: "indigo" }
      : null,
    summary.primaryIntent?.trim()
      ? {
          id: "intent",
          icon: FiMessageCircle,
          label: summary.primaryIntent.trim(),
          tone: "slate",
        }
      : null,
    summary.urgency?.trim()
      ? {
          id: "urgency",
          icon: FiAlertTriangle,
          label: summary.urgency.trim(),
          tone: "amber",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    icon: ElementType;
    label: string;
    tone: "indigo" | "slate" | "amber";
  }>;

  const statusBadge: StatusBadge = isAssistantThinking
    ? { label: "AI가 최신 정보를 정리 중입니다.", accent: "processing" }
    : isLoading
      ? { label: "요약 새로 고치는 중...", accent: "updating" }
      : conversationPreview
        ? { label: "최신 요약이 준비되었습니다.", accent: "ready" }
        : null;

  let statusBadgeNode: ReactNode = null;
  if (statusBadge) {
    const { icon: IconComponent, iconClass, wrapper } =
      statusBadgeStyles[statusBadge.accent];
    statusBadgeNode = (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${wrapper}`}
      >
        <IconComponent className={`h-3.5 w-3.5 ${iconClass ?? ""}`} />
        {statusBadge.label}
      </span>
    );
  }

  const keyFacts = summary.keyFacts
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const missingDetails = summary.missingDetails
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  const recommendedDocuments = summary.recommendedDocuments
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const quickStats: QuickStat[] = [];
  if (keyFacts.length) {
    quickStats.push({
      id: "facts",
      label: "확보된 사실",
      value: keyFacts.length,
      accent: "emerald",
      icon: FiCheckCircle,
    });
  }
  if (missingDetails.length) {
    quickStats.push({
      id: "gaps",
      label: "확인 필요 항목",
      value: missingDetails.length,
      accent: "amber",
      icon: FiAlertTriangle,
    });
  }
  if (recommendedDocuments.length) {
    quickStats.push({
      id: "docs",
      label: "준비 자료",
      value: recommendedDocuments.length,
      accent: "slate",
      icon: FiFileText,
    });
  }

  const clusters: InsightPanelProps[] = [
    {
      icon: FiCheckCircle,
      title: "핵심 사실 정리",
      description: "대화에서 확인된 사건 고정 사실입니다.",
      tone: "emerald",
      items: keyFacts,
      emptyCopy:
        "확보된 사실이 등록되면 핵심 문장 형태로 정리되어 표시됩니다.",
    },
    {
      icon: FiAlertTriangle,
      title: "미확인 정보 공백",
      description: "추가 질문이나 자료 요청이 필요한 부분입니다.",
      tone: "amber",
      items: missingDetails,
      emptyCopy:
        "확인해야 할 정보가 포착되면 자동으로 공백 목록이 채워집니다.",
    },
    {
      icon: FiFileText,
      title: "권장 준비 자료",
      description: "탐정에게 전달하면 좋은 참고 자료입니다.",
      tone: "slate",
      items: recommendedDocuments,
      emptyCopy:
        "대화를 통해 필요한 자료가 선별되면 여기서 바로 확인할 수 있습니다.",
    },
  ];

  const copyButtonLabel =
    copyStatus === "copied"
      ? "복사 완료"
      : copyStatus === "error"
        ? "복사 실패"
        : "요약 복사";

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/40 p-6 shadow-sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-indigo-300">
                Case Overview
              </p>
              <h2 className="break-words text-2xl font-semibold leading-tight text-slate-900">
                {caseTitle}
              </h2>
            </div>
            {statusBadgeNode}
          </div>

          {detailChips.length ? (
            <div className="flex flex-wrap gap-2">
              {detailChips.map(({ id, icon: IconComponent, label, tone }) => (
                <span
                  key={id}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    tone === "indigo"
                      ? "border-indigo-100 bg-indigo-50/80 text-indigo-600"
                      : tone === "amber"
                        ? "border-amber-100 bg-amber-50/80 text-amber-600"
                        : "border-slate-200 bg-white/80 text-slate-600"
                  }`}
                >
                  <IconComponent className="h-3.5 w-3.5" />
                  <span className="leading-none">{label}</span>
                </span>
              ))}
            </div>
          ) : null}

          {objective ? (
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                <FiClipboard className="h-3.5 w-3.5" />
                조사 목표
              </p>
              <p className="mt-2 text-sm leading-relaxed text-indigo-900" style={clampStyle(6)}>
                {objective}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                대화 요약
              </p>
              <button
                type="button"
                onClick={handleCopySummary}
                disabled={!conversationPreview}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  conversationPreview
                    ? "border border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                    : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                }`}
              >
                {copyStatus === "copied" ? (
                  <>
                    <FiCheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    {copyButtonLabel}
                  </>
                ) : copyStatus === "error" ? (
                  <>
                    <FiAlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    {copyButtonLabel}
                  </>
                ) : (
                  <>
                    <FiCopy className="h-3.5 w-3.5" />
                    {copyButtonLabel}
                  </>
                )}
              </button>
            </div>
            <p
              className="mt-3 whitespace-pre-wrap break-words leading-relaxed"
              style={clampStyle(8)}
            >
              {conversationPreview
                ? conversationPreview
                : "대화를 계속하면 주요 논의 내용이 실시간으로 정리됩니다."}
            </p>
          </div>
        </div>
      </motion.section>

      {quickStats.length ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.05 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {quickStats.map((stat) => (
            <QuickStatCard key={stat.id} {...stat} />
          ))}
        </motion.div>
      ) : null}

      <div className="space-y-6">
        {clusters.map((cluster) => (
          <InsightPanel key={cluster.title} {...cluster} />
        ))}
      </div>
    </div>
  );
};
