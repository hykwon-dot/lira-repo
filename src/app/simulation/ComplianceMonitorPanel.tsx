"use client";

import { FiAlertCircle, FiCheck, FiRefreshCcw, FiShield, FiTarget } from "react-icons/fi";
import type { AiComplianceReport } from "@/lib/ai/types";

interface ComplianceMonitorPanelProps {
  report: AiComplianceReport | null;
  isLoading: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

const severityBadge: Record<"low" | "medium" | "high", string> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-600",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-rose-200 bg-rose-50 text-rose-700",
};

export function ComplianceMonitorPanel({ report, isLoading, error, onRefresh }: ComplianceMonitorPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white/70" />
        <div className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white/60" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-400">
        대화가 누적되면 규제/윤리 감시 리포트가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              <FiShield className="h-3.5 w-3.5" /> 규제 감시 스냅샷
            </span>
            <p className="text-sm leading-relaxed text-slate-600">{report.summary}</p>
          </div>
          <div className={`rounded-2xl border px-4 py-3 text-center text-xs font-semibold ${severityBadge[report.overallSeverity]}`}>
            <p className="uppercase tracking-[0.16em]">Risk Level</p>
            <p className="mt-1 text-lg">{report.overallSeverity === "high" ? "심각" : report.overallSeverity === "medium" ? "주의" : "양호"}</p>
            <p className="text-[10px]">청정 세그먼트 {report.cleanSegments}/{report.totalSegments}</p>
          </div>
        </div>
        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[12px] text-rose-600">
            <FiAlertCircle className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <FiRefreshCcw className="h-3.5 w-3.5" /> 다시 검사
          </button>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FiTarget className="h-4 w-4 text-indigo-500" /> 핵심 지표
        </h4>
        <div className="mt-3 grid gap-3 text-[12px] sm:grid-cols-2">
          {report.metrics.map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-3 py-3 text-indigo-700">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
                <span>{metric.label}</span>
                <span className="rounded-full border border-indigo-200 bg-white/70 px-2 py-0.5 text-[10px] text-indigo-600">{metric.threshold}점↑</span>
              </div>
              <p className="mt-2 text-lg font-semibold text-indigo-700">{metric.score}</p>
              <p className="mt-1 text-[11px] text-indigo-600">{metric.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <FiAlertCircle className="h-4 w-4 text-rose-500" /> 플래그된 이슈
        </h4>
        {report.flaggedIssues.length ? (
          <ul className="mt-3 space-y-3 text-[12px] text-slate-600">
            {report.flaggedIssues.map((issue) => (
              <li key={issue.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold">
                  <span className="uppercase tracking-[0.16em] text-slate-500">{issue.category}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${severityBadge[issue.severity]}`}>
                    {issue.severity === "high" ? "긴급" : issue.severity === "medium" ? "주의" : "참고"}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-800">{issue.snippet}</p>
                <p className="mt-2 text-[11px] text-rose-500">대응: {issue.guidance}</p>
                <p className="mt-1 text-[10px] text-slate-400">근거: {issue.regulationReferences.join(", ") || "내부 정책"}</p>
                <p className="mt-1 text-[10px] text-slate-400">출처: {issue.source}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-[12px] text-emerald-700">
            <FiCheck className="h-4 w-4" />
            <span>위험 징후가 감지되지 않았습니다.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplianceMonitorPanel;
