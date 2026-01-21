"use client";

import type { CSSProperties, ElementType, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClipboard,
  FiCopy,
  FiBookmark,
  FiCompass,
  FiInfo,
  FiLayers,
  FiMessageCircle,
  FiRefreshCcw,
  FiTrendingUp,
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

type GuidanceAccent = "indigo" | "emerald" | "amber" | "violet";

interface GuidanceSectionProps {
  id: string;
  icon: ElementType;
  title: string;
  description: string;
  accent: GuidanceAccent;
  items: string[];
}

const guidanceAccentStyles: Record<
  GuidanceAccent,
  {
    border: string;
    icon: string;
    badge: string;
    bullet: string;
  }
> = {
  indigo: {
    border:
      "border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50",
    icon: "bg-indigo-500/10 text-indigo-600",
    badge: "border border-indigo-100 bg-indigo-50 text-indigo-600",
    bullet: "bg-indigo-500/15 text-indigo-600",
  },
  emerald: {
    border:
      "border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50",
    icon: "bg-emerald-500/10 text-emerald-600",
    badge: "border border-emerald-100 bg-emerald-50 text-emerald-600",
    bullet: "bg-emerald-500/15 text-emerald-600",
  },
  amber: {
    border:
      "border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-amber-50",
    icon: "bg-amber-500/10 text-amber-600",
    badge: "border border-amber-100 bg-amber-50 text-amber-600",
    bullet: "bg-amber-500/15 text-amber-600",
  },
  violet: {
    border:
      "border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-violet-50",
    icon: "bg-violet-500/10 text-violet-600",
    badge: "border border-violet-100 bg-violet-50 text-violet-600",
    bullet: "bg-violet-500/15 text-violet-600",
  },
};

const GuidanceSection = ({
  icon: Icon,
  title,
  description,
  accent,
  items,
}: GuidanceSectionProps) => {
  const styles = guidanceAccentStyles[accent];
  const visibleItems = items.slice(0, 6);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className={`rounded-3xl border p-6 shadow-sm ${styles.border}`}
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
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${styles.badge}`}
        >
          {visibleItems.length}개 제안
        </span>
      </header>
      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
        {visibleItems.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex items-start gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-3"
          >
            <span
              className={`mt-1 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${styles.bullet}`}
            >
              {index + 1}
            </span>
            <span className="flex-1 break-words" style={clampStyle(5)}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
};

const DEFAULT_SAMPLE_QUESTIONS = [
  "사건이 시작된 시점과 지금까지의 흐름을 시간순으로 정리해 달라고 요청해 보세요.",
  "연관된 인물마다 알리바이와 현재 위치를 물어보고 정리해 달라고 해보세요.",
  "확실한 사실과 추측을 구분해 달라고 하면 다음 대화가 더 명확해집니다.",
  "현재 가장 큰 리스크가 무엇인지 AI에게 우선순위를 묻고 확인해 보세요.",
  "탐정에게 어떤 결과물을 전달해야 하는지 미리 정리할 수 있도록 안내를 받아보세요.",
];

const DEFAULT_CLARIFICATION_TOPICS = [
  "사건이 발생한 정확한 장소와 시간대를 다시 확인해 보세요.",
  "관련 인물 각각의 역할과 관계를 정리해 보세요.",
  "이미 기관에 신고했거나 조치한 내용이 있다면 진행 상태를 정리해 두세요.",
  "의심 가는 정황에 대한 근거 자료가 있는지, 없다면 어떻게 확보할 수 있을지 생각해 보세요.",
];

const DEFAULT_PREPARATION_TIPS = [
  "대화 내용과 증거 자료는 항목별로 폴더를 만들어 정리해 두면 매칭 시 유리합니다.",
  "메시지, 이메일, 녹취 등 디지털 자료는 캡처 날짜와 출처를 함께 기록해 두세요.",
  "관련 인물의 연락처, 직함, 소속 정보를 업데이트해 두면 추가 질문에 빠르게 대응할 수 있습니다.",
  "계약서, 영수증, 송금 내역 등 객관적 자료는 스캔 또는 사진 촬영으로 바로 공유할 수 있게 준비하세요.",
];

const DEFAULT_NEXT_STEPS = [
  "대화가 끝나면 요약 카드를 한 번 더 검토하고 사실과 의견을 구분해 체크하세요.",
  "탐정에게 전달할 때는 사건 목표와 원하는 결과를 명확히 적어 주세요.",
  "추가 조사 전에 내부적으로 공유해도 되는 정보와 민감한 정보를 구분해 정리해 두세요.",
  "필요하다면 관련 법률 상담, 보험 여부, CCTV 보관 기간 등 외부 변수도 미리 확인해 두세요.",
];

const convertDetailToQuestion = (detail: string) =>
  `"${detail}" 부분에서 놓치고 있는 사실이나 증거가 무엇인지 AI에게 다시 질문해 보세요.`;

const convertDocumentToTip = (document: string) =>
  `"${document}" 자료를 어떤 형식으로 준비하면 탐정이 바로 활용할 수 있을지 안내를 요청해 보세요.`;


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

const ChecklistPhase = ({ phase, isActive }: { phase: any; isActive: boolean }) => {
  // Depth calculation for visual bar (1 to 5)
  const depthPercentage = phase.depth ? (phase.depth / 5) * 100 : 0;
  
  return (
    <div className={`mb-4 rounded-xl border p-3 transition-all ${
      phase.status === 'completed' 
        ? 'border-emerald-200 bg-emerald-50/50' 
        : isActive 
          ? 'border-indigo-200 bg-indigo-50/50 ring-1 ring-indigo-100' 
          : 'border-slate-100 bg-white'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
            phase.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
            isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
          }`}>
            {phase.status === 'completed' ? <FiCheckCircle /> : phase.id}
          </div>
          <span className={`text-sm font-semibold ${
             phase.status === 'completed' ? 'text-emerald-700' : 
             isActive ? 'text-indigo-700' : 'text-slate-600'
          }`}>
            {phase.label}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          {phase.status === 'completed' ? '완료' : phase.status === 'in_progress' ? '진행중' : '대기'}
        </span>
      </div>
      
      {/* Depth Indicator Bar */}
      {phase.status !== 'pending' && (
        <div className="mb-3 px-1">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>정보 심도 (Depth)</span>
            <span className="font-medium text-slate-600">Lv.{phase.depth || 1}/5</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                phase.status === 'completed' ? 'bg-emerald-400' : 'bg-indigo-400'
              }`}
              style={{ width: `${Math.max(depthPercentage, 5)}%` }}
            />
          </div>
        </div>
      )}

      {phase.description && (
        <p className="pl-8 text-xs text-slate-600 mb-2 leading-relaxed">
          {phase.description}
        </p>
      )}

      {phase.keyPoints && phase.keyPoints.length > 0 && (
        <ul className="pl-8 space-y-1">
          {phase.keyPoints.map((point: string, i: number) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <header className="mb-4 flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 ring-4 ring-white">
      <Icon className="h-4 w-4 text-slate-500" />
    </div>
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
  </header>
);

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
            상담을 이어가면 사건 개요와 함께 다음에 물어보면 좋을 질문과 준비 자료를 추천해 드립니다.
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
  const nextQuestions = summary.nextQuestions
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  const questionSuggestions = (
    nextQuestions.length
      ? nextQuestions
      : missingDetails.length
        ? missingDetails.map(convertDetailToQuestion)
        : DEFAULT_SAMPLE_QUESTIONS
  ).slice(0, 5);

  const clarificationPrompts = (
    missingDetails.length
      ? missingDetails.map(
          (detail) =>
            `"${detail}"에 대해 언제, 누가, 어떤 정황에서 언급되었는지 정리해 두세요. 추가 사실이 떠오르면 즉시 기록해 두면 좋아요.`,
        )
      : DEFAULT_CLARIFICATION_TOPICS
  ).slice(0, 5);

  const preparationTips = (
    recommendedDocuments.length
      ? recommendedDocuments.map(convertDocumentToTip)
      : DEFAULT_PREPARATION_TIPS
  ).slice(0, 5);

  const dynamicNextSteps: string[] = [];
  if (objective) {
    dynamicNextSteps.push(
      `의뢰 목표가 "${objective}"라면, 원하는 결과물과 활용 계획을 정리해 두고 다음 상담 때 바로 공유해 보세요.`,
    );
  }
  if (summary.urgency?.trim()) {
    dynamicNextSteps.push(
      `현재 긴급도는 "${summary.urgency.trim()}"로 표시되었습니다. 지연될 경우 어떤 리스크가 생기는지 AI에게 다시 점검받아 보세요.`,
    );
  }
  if (keyFacts.length) {
    dynamicNextSteps.push(
      `지금까지 확인된 핵심 사실은 ${keyFacts.length}건입니다. AI에게 사실과 추측이 섞이지 않았는지 다시 한번 검토 요청해 보세요.`,
    );
  }
  if (caseTitle && caseTitle !== "사건 제목 미정") {
    dynamicNextSteps.push(
      `"${caseTitle}"라는 이름으로 자료 폴더를 만들고 증거, 일정, 관계도를 구분해 정리하면 추후 공유가 쉬워집니다.`,
    );
  }
  if (conversationPreview) {
    dynamicNextSteps.push(
      "AI가 정리한 요약을 사실관계와 대조해 체크하고, 추가 질문이 필요하면 같은 화면에서 바로 이어가 보세요.",
    );
  }

  const nextStepTips = [...dynamicNextSteps, ...DEFAULT_NEXT_STEPS]
    .filter((item, index, array) => item && array.indexOf(item) === index)
    .slice(0, 5);

  const guidanceSections: GuidanceSectionProps[] = [
    {
      id: "questions",
      icon: FiMessageCircle,
      title: "바로 물어보기 좋은 질문",
      description:
        "AI에게 이렇게 요청하면 핵심 정보를 빠르게 정리할 수 있어요.",
      accent: "indigo",
      items: questionSuggestions,
    },
    {
      id: "clarification",
      icon: FiCompass,
      title: "추가로 확인하면 좋은 정보",
      description:
        "빈틈을 줄이면 이후 상담이나 증거 수집이 훨씬 수월해집니다.",
      accent: "emerald",
      items: clarificationPrompts,
    },
    {
      id: "preparation",
      icon: FiBookmark,
      title: "미리 준비하면 좋은 자료",
      description:
        "공유 가능한 자료를 미리 정리해 두면 매칭 후 실무가 빨라져요.",
      accent: "amber",
      items: preparationTips,
    },
    {
      id: "next-steps",
      icon: FiTrendingUp,
      title: "다음 단계 제안",
      description: "대화 이후 어떤 순서로 움직이면 좋을지 추천드립니다.",
      accent: "violet",
      items: nextStepTips,
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

      <div className="space-y-5">
        {guidanceSections.map((section) => (
          <GuidanceSection key={section.id} {...section} />
        ))}
      </div>

      <div className="mt-8">
        <SectionHeader icon={FiCheckCircle} title="진행 단계 (5단계 체크리스트)" />
        <div className="mt-3">
           {summary?.investigationChecklist ? (
             summary.investigationChecklist.map((phase) => (
               <ChecklistPhase 
                 key={phase.id} 
                 phase={phase} 
                 isActive={phase.id === (summary.currentPhase ?? 1)} 
               />
             ))
           ) : (
             <div className="text-sm text-slate-400 p-4 text-center border border-dashed rounded-xl">
               아직 체크리스트 데이터가 없습니다.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
