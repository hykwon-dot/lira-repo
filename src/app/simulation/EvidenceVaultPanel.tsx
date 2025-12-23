"use client";

import {
  FiFileText,
  FiShield,
  FiRefreshCcw,
  FiLoader,
  FiAlertTriangle,
  FiExternalLink,
} from "react-icons/fi";
import type { AiEvidenceSummary, EvidenceArtifactInput } from "@/lib/ai/types";

interface EvidenceVaultPanelProps {
  artifacts: EvidenceArtifactInput[];
  summaries: AiEvidenceSummary[];
  isLoading: boolean;
  error: string | null;
  onRefresh?: () => void;
}

const riskTone: Record<AiEvidenceSummary["riskLevel"], string> = {
  high: "border-rose-200 bg-rose-50/80 text-rose-600",
  medium: "border-amber-200 bg-amber-50/80 text-amber-700",
  low: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
};

export function EvidenceVaultPanel({ artifacts, summaries, isLoading, error, onRefresh }: EvidenceVaultPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">증거 보관함</h3>
          <p className="text-[11px] text-slate-500">업로드/추천된 자료를 AI가 분류하고 우선순위를 제안합니다.</p>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiRefreshCcw className="h-3.5 w-3.5" />}
            다시 분석
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-600">
          <FiAlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">등록된 자료</p>
          {artifacts.length ? (
            <ul className="mt-2 space-y-1">
              {artifacts.map((artifact) => (
                <li key={artifact.id} className="flex items-start gap-2">
                  <FiFileText className="mt-1 h-3.5 w-3.5 text-indigo-500" />
                  <div>
                    <p className="font-semibold text-slate-800">{artifact.title}</p>
                    <p className="text-[11px] text-slate-400">{artifact.type === "other" ? "기타 자료" : artifact.type.toUpperCase()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-slate-400">분석할 증거 자료가 아직 없습니다.</p>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-4 text-[12px] text-indigo-600">
            <FiLoader className="h-4 w-4 animate-spin" />
            증거 분석 중...
          </div>
        ) : summaries.length ? (
          summaries.map((summary) => (
            <div
              key={summary.id}
              className={`rounded-2xl border px-4 py-3 text-[12px] shadow-sm ${riskTone[summary.riskLevel]}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{summary.classification}</p>
                  <p className="text-sm font-semibold text-slate-900">{summary.title}</p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/30 px-2 py-0.5 font-semibold">
                    <FiShield className="h-3 w-3" />
                    {(summary.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              {summary.keyFindings.length ? (
                <div className="mt-2 space-y-1">
                  {summary.keyFindings.map((finding, index) => (
                    <p key={`finding-${summary.id}-${index}`} className="leading-relaxed text-slate-800">
                      • {finding}
                    </p>
                  ))}
                </div>
              ) : null}
              {summary.recommendedActions.length ? (
                <div className="mt-3 rounded-xl border border-white/60 bg-white/50 px-3 py-2 text-[11px] text-slate-700">
                  <p className="font-semibold uppercase tracking-[0.14em] text-slate-500">Recommended</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {summary.recommendedActions.map((action, index) => (
                      <li key={`action-${summary.id}-${index}`}>{action}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
            분석 결과를 확인하려면 증거 자료를 추가하거나 추천 자료를 수집하세요.
          </div>
        )}
      </div>

      {artifacts.length ? (
        <div className="flex items-center justify-end text-[11px] text-slate-400">
          <FiExternalLink className="mr-1 h-3.5 w-3.5" /> 추가 증거 업로드 기능 준비 중
        </div>
      ) : null}
    </div>
  );
}

export default EvidenceVaultPanel;
