"use client";

import { IntakeSummary } from "./types";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiHelpCircle,
  FiInfo,
  FiLayers,
  FiMessageCircle,
} from "react-icons/fi";
import { useMemo } from "react";

interface CaseSummarySidebarProps {
  summary: IntakeSummary | null;
  conversationSummary: string | null;
  recommendedQuestions: string[];
  onQuestionClick: (question: string) => void;
  isLoading: boolean;
  isAssistantThinking: boolean;
}

const SectionCard = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.24 }}
    className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm"
  >
    <header className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    </header>
    <div className="space-y-2 text-sm text-slate-600">{children}</div>
  </motion.section>
);

export const CaseSummarySidebar = ({
  summary,
  conversationSummary,
  recommendedQuestions,
  onQuestionClick,
  isLoading,
  isAssistantThinking,
}: CaseSummarySidebarProps) => {
  const hasSummary = Boolean(summary);

  const placeholder = useMemo(
    () => (
      <div className="relative flex h-full min-h-[320px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-white/20 bg-gradient-to-br from-slate-900/40 via-slate-900/30 to-indigo-900/40 p-6 text-center text-sm text-indigo-100">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#6366f1_0%,rgba(79,70,229,0)_55%)] opacity-40" />
        <div className="relative flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/10">
            <FiInfo className="h-5 w-5 text-indigo-100" />
          </div>
          <p className="mt-4 text-sm font-semibold text-indigo-50">사건 정보를 정리하는 중입니다.</p>
          <p className="mt-2 text-xs text-indigo-200/80">
            대화를 이어가면 핵심 사실과 필요한 질문이 실시간으로 정리돼요.
          </p>
        </div>
      </div>
    ),
    [],
  );

  if (!hasSummary) {
    return placeholder;
  }

  const safeSummary = summary!;

  const infoBadges = [
    safeSummary.caseType ? { label: "사건 유형", value: safeSummary.caseType } : null,
    safeSummary.urgency ? { label: "긴급도", value: safeSummary.urgency } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const spotlightCards = [
    safeSummary.primaryIntent
      ? {
          label: "의뢰 목적",
          value: safeSummary.primaryIntent,
        }
      : null,
    safeSummary.objective
      ? {
          label: "원하는 결과",
          value: safeSummary.objective,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const hasKeyFacts = safeSummary.keyFacts && safeSummary.keyFacts.length > 0;
  const hasMissingDetails = safeSummary.missingDetails && safeSummary.missingDetails.length > 0;
  const hasRecommendedDocs = safeSummary.recommendedDocuments && safeSummary.recommendedDocuments.length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-slate-900 p-5 text-white shadow-xl"
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,#a5b4fc_0%,rgba(165,180,252,0)_70%)] opacity-60" />
        <div className="relative space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-indigo-100/80">
                Intake Overview
              </p>
              <h3 className="mt-2 text-xl font-semibold leading-snug">
                {safeSummary.caseTitle || "사건 제목 미정"}
              </h3>
            </div>
            {isAssistantThinking || isLoading ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                분석 중
              </div>
            ) : null}
          </div>

          {infoBadges.length ? (
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              {infoBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-3 py-1 text-indigo-100"
                >
                  {badge.value}
                </span>
              ))}
            </div>
          ) : null}

          {spotlightCards.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {spotlightCards.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-100/70">
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-50">{item.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </motion.section>

      {conversationSummary ? (
        <SectionCard icon={FiClipboard} title="탐정에게 전달될 요약">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <FiMessageCircle className="h-3.5 w-3.5" /> 요약 브리핑
            </p>
            <p className="mt-2 whitespace-pre-wrap">{conversationSummary}</p>
          </div>
        </SectionCard>
      ) : null}

      {hasKeyFacts ? (
        <SectionCard icon={FiLayers} title="확보된 핵심 사실">
          <ul className="space-y-2 text-sm text-slate-600">
            {safeSummary.keyFacts.map((fact, index) => (
              <motion.li
                key={`fact-${index}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2"
              >
                <span className="mt-1 text-indigo-500">
                  <FiCheckCircle className="h-4 w-4" />
                </span>
                <span className="flex-1 leading-relaxed">{fact}</span>
              </motion.li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {hasMissingDetails ? (
        <SectionCard icon={FiAlertTriangle} title="추가로 확인이 필요한 정보">
          <ul className="space-y-1 text-sm text-rose-700">
            {safeSummary.missingDetails.map((item, index) => (
              <motion.li
                key={`missing-${index}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2"
              >
                <span className="mt-1 text-rose-500">
                  <FiActivity className="h-4 w-4" />
                </span>
                <span className="flex-1 leading-relaxed">{item}</span>
              </motion.li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {hasRecommendedDocs ? (
        <SectionCard icon={FiFileText} title="준비하면 좋은 자료">
          <ul className="space-y-1 text-sm text-slate-600">
            {safeSummary.recommendedDocuments.map((doc, index) => (
              <motion.li
                key={`doc-${index}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                {doc}
              </motion.li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard icon={FiHelpCircle} title="다음으로 물어볼 질문">
        <div className="space-y-2">
          {recommendedQuestions && recommendedQuestions.length > 0 ? (
            recommendedQuestions.map((question, index) => (
              <motion.button
                key={`question-${index}`}
                type="button"
                onClick={() => onQuestionClick(question)}
                disabled={isAssistantThinking}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-left text-sm font-medium text-indigo-700 transition hover:border-indigo-200 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex-1">{question}</span>
                <span className="text-xs font-semibold text-indigo-400">질문하기 →</span>
              </motion.button>
            ))
          ) : (
            <p className="text-xs text-slate-500">추천 질문이 준비되면 여기에 표시됩니다.</p>
          )}
        </div>
        {isLoading ? (
          <p className="pt-2 text-xs text-indigo-400">최신 정보를 정리하는 중...</p>
        ) : null}
      </SectionCard>
    </div>
  );
};
