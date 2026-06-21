"use client";

import { FiAnchor, FiAward, FiFeather, FiHeadphones, FiRefreshCcw, FiShield, FiTarget, FiUsers } from "react-icons/fi";
import type { ReactNode } from "react";
import type { AiNegotiationCoachPlan } from "@/lib/ai/types";

interface NegotiationCoachPanelProps {
  plan: AiNegotiationCoachPlan | null;
  isLoading: boolean;
  error?: string | null;
  onRegenerate?: () => void;
  showInvestigatorInsights?: boolean;
  restrictedNotice?: ReactNode;
}

const severityBadge: Record<AiNegotiationCoachPlan["riskWarnings"][number]["severity"], string> = {
  high: "border-rose-200 bg-rose-50 text-rose-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function NegotiationCoachPanel({
  plan,
  isLoading,
  error,
  onRegenerate,
  showInvestigatorInsights = true,
  restrictedNotice,
}: NegotiationCoachPanelProps) {
  if (!showInvestigatorInsights) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        {restrictedNotice ?? (
          <p className="leading-relaxed">
            협상 스크립트 코치는 탐정 또는 관리자 전용 기능입니다. 사건을 맡은 민간조사원 계정으로 접속하면 전략 지침을 확인할 수 있습니다.
          </p>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white/70" />
        <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white/60" />
        <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white/60" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
        대화가 조금 더 진행되면 협상 스크립트 코치가 활성화됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              <FiHeadphones className="h-3.5 w-3.5" /> 협상 코치 요약
            </span>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{plan.primaryGoal}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{plan.situationSummary}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-700">
            <p className="font-semibold uppercase tracking-[0.16em] text-indigo-500">톤 가이드</p>
            <p className="mt-2 text-sm font-semibold text-indigo-700">{plan.toneGuidance.primaryTone}</p>
            {plan.toneGuidance.backupTone ? (
              <p className="text-[11px] text-indigo-500">대체 톤: {plan.toneGuidance.backupTone}</p>
            ) : null}
            {plan.toneGuidance.cues.length ? (
              <ul className="mt-2 space-y-1 text-[11px] text-indigo-500">
                {plan.toneGuidance.cues.map((cue, index) => (
                  <li key={`tone-cue-${index}`}>• {cue}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[12px] text-rose-600">
            {error}
          </p>
        ) : null}
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <FiRefreshCcw className="h-3.5 w-3.5" /> 다시 생성
          </button>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FiTarget className="h-4 w-4 text-indigo-500" /> 전략 축
        </h4>
        {plan.strategyPillars.length ? (
          <ul className="mt-3 grid gap-2 text-[12px] text-slate-600 sm:grid-cols-2">
            {plan.strategyPillars.map((pillar, index) => (
              <li
                key={`pillar-${index}`}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-indigo-700"
              >
                {pillar}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-200 px-3 py-4 text-center text-[12px] text-slate-400">
            아직 정리된 전략 축이 없습니다.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiFeather className="h-4 w-4 text-emerald-500" /> 추천 스크립트
          </h4>
          <div className="mt-3 space-y-3">
            {plan.scriptedResponses.map((script) => (
              <div key={script.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[12px] text-emerald-700 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.16em] text-emerald-600">
                    <FiAward className="h-3.5 w-3.5" /> {script.label}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-white/70 px-2 py-0.5 font-semibold text-emerald-600">
                    신뢰 지수 {Math.round(script.trustImpact * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-emerald-900">{script.script}</p>
                <p className="mt-2 text-[11px] text-emerald-700">근거: {script.rationale}</p>
                {script.recommendedNextStep ? (
                  <p className="mt-1 text-[11px] text-emerald-600">다음 단계: {script.recommendedNextStep}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiUsers className="h-4 w-4 text-slate-500" /> 예상 반론 대응
          </h4>
          <div className="mt-3 space-y-3">
            {plan.objectionHandlers.map((handler) => (
              <div key={handler.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-600">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{handler.label}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{handler.script}</p>
                <p className="mt-2 text-[11px] text-slate-500">근거: {handler.rationale}</p>
                {handler.recommendedNextStep ? (
                  <p className="mt-1 text-[11px] text-slate-500">다음 단계: {handler.recommendedNextStep}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FiShield className="h-4 w-4 text-rose-500" /> 주의 신호
        </h4>
        <div className="mt-3 space-y-2">
          {plan.riskWarnings.map((warning) => (
            <div
              key={warning.id}
              className={`rounded-2xl border px-4 py-3 text-[12px] shadow-sm ${severityBadge[warning.severity]}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{warning.title}</span>
                <span className="rounded-full border border-white/40 bg-white/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]">
                  {warning.severity === "high" ? "긴급" : warning.severity === "medium" ? "주의" : "관찰"}
                </span>
              </div>
              <p className="mt-1 text-[11px] opacity-90">{warning.detail}</p>
              <p className="mt-2 text-[12px] font-medium">대응: {warning.mitigation}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiAnchor className="h-4 w-4 text-indigo-500" /> 후속 질문
          </h4>
          <ul className="mt-3 space-y-2 text-[12px] text-slate-600">
            {plan.followUpPrompts.map((prompt, index) => (
              <li key={`prompt-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                {prompt}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiFeather className="h-4 w-4 text-emerald-500" /> 라포 형성 팁
          </h4>
          <ul className="mt-3 space-y-2 text-[12px] text-slate-600">
            {plan.rapportTips.map((tip, index) => (
              <li key={`tip-${index}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-700">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default NegotiationCoachPanel;
