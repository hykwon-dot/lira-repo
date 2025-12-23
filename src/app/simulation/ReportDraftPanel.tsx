'use client';

import { useCallback, useMemo } from "react";
import {
  FiBookOpen,
  FiDownload,
  FiLoader,
  FiRefreshCcw,
  FiTrendingUp,
  FiAlertTriangle,
  FiCheckSquare,
  FiClipboard,
} from "react-icons/fi";
import type { AiInvestigationReportDraft } from "@/lib/ai/types";

interface ReportDraftPanelProps {
  report: AiInvestigationReportDraft | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  showInvestigatorInsights?: boolean;
}

const severityTone = {
  high: "bg-rose-50/80 border-rose-200 text-rose-700",
  medium: "bg-amber-50/80 border-amber-200 text-amber-700",
  low: "bg-emerald-50/80 border-emerald-200 text-emerald-700",
} as const;

const statusTone: Record<string, string> = {
  완료: "text-emerald-600",
  "진행 중": "text-indigo-600",
  대기: "text-slate-500",
};

export function ReportDraftPanel({ report, isLoading, error, onGenerate, showInvestigatorInsights = false }: ReportDraftPanelProps) {
  const generatedLabel = useMemo(() => {
    if (!report?.generatedAt) return null;
    try {
      const date = new Date(report.generatedAt);
      return `${date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ${date
        .toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        .replace(/:/, "시 ")}분`;
    } catch {
      return null;
    }
  }, [report?.generatedAt]);

  const handleDownload = useCallback(() => {
    if (!report) return;
    const title = report.title.replace(/[^0-9a-zA-Z가-힣-_ ]/g, "").trim() || "investigation-report";
    const blob = new Blob([report.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [report]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">조사 리포트 초안</h3>
          <p className="text-[11px] text-slate-500">대화·리스크·증거 정보를 모아 초안을 자동으로 생성합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onGenerate}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiRefreshCcw className="h-3.5 w-3.5" />}
            {report ? "리포트 업데이트" : "리포트 생성"}
          </button>
          {report ? (
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600 transition hover:bg-indigo-100"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Markdown
            </button>
          ) : null}
        </div>
      </div>

      {generatedLabel ? (
        <p className="text-right text-[10px] uppercase tracking-[0.16em] text-slate-400">최근 생성 {generatedLabel}</p>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-[12px] text-rose-600">
          <FiAlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {report ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-[12px] text-indigo-700">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Executive Summary</p>
            <p className="mt-1 text-sm font-semibold text-indigo-700">{report.title}</p>
            <p className="mt-2 leading-relaxed text-indigo-600">{report.executiveSummary}</p>
          </div>

          {report.keyInsights.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <FiBookOpen className="h-3.5 w-3.5" /> Key Insights
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {report.keyInsights.map((insight, index) => (
                  <li key={`insight-${index}`}>{insight}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.riskHighlights.length ? (
            <div className="space-y-2">
              {report.riskHighlights.map((highlight, index) => (
                <div
                  key={`risk-${index}`}
                  className={`rounded-2xl border px-4 py-3 text-[12px] shadow-sm ${severityTone[highlight.severity]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{highlight.title}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {highlight.severity === "high" ? "P0" : highlight.severity === "medium" ? "P1" : "Observe"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">{highlight.detail}</p>
                  <p className="mt-2 leading-relaxed text-slate-700">{highlight.recommendation}</p>
                </div>
              ))}
            </div>
          ) : null}

          {report.actionItems.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <FiCheckSquare className="h-3.5 w-3.5" /> Action Items
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                {report.actionItems.map((item, index) => (
                  <li key={`action-${index}`}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}

          {report.timelineEntries.length ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <FiTrendingUp className="h-3.5 w-3.5" /> Timeline Overview
              </p>
              <div className="mt-2 space-y-2">
                {report.timelineEntries.map((entry, index) => (
                  <div key={`timeline-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                      <span>{entry.phase}</span>
                      <span className={statusTone[entry.status] ?? "text-slate-500"}>{entry.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{entry.etaLabel}</p>
                    <p className="mt-2 leading-relaxed text-slate-600">{entry.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {report.evidenceHighlights.length ? (
            <div className="space-y-2">
              {report.evidenceHighlights.map((evidence, index) => (
                <div
                  key={`evidence-${index}`}
                  className={`rounded-2xl border px-4 py-3 text-[12px] text-slate-600 shadow-sm ${severityTone[evidence.riskLevel]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">{evidence.title}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {evidence.classification}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-700">{evidence.keyFinding}</p>
                </div>
              ))}
            </div>
          ) : null}

          {report.followUpChecklist.length ? (
            showInvestigatorInsights ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <FiClipboard className="h-3.5 w-3.5" /> Follow-up Checklist
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {report.followUpChecklist.map((item, index) => (
                    <li key={`follow-up-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
                <p className="text-xs font-semibold text-slate-600">Follow-up Checklist (탐정 전용)</p>
                <p className="mt-1 leading-relaxed">사건을 담당한 민간조사원 계정에서만 후속 점검 목록을 확인할 수 있습니다.</p>
              </div>
            )
          ) : null}

          {report.appendixNotes.length ? (
            showInvestigatorInsights ? (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <FiAlertTriangle className="h-3.5 w-3.5" /> Appendix Notes
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-4">
                  {report.appendixNotes.map((note, index) => (
                    <li key={`appendix-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
                <p className="text-xs font-semibold text-slate-600">Appendix Notes (탐정 전용)</p>
                <p className="mt-1 leading-relaxed">부록 분석 메모는 탐정 또는 관리자 권한에서 확인 가능합니다.</p>
              </div>
            )
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
          리포트를 생성하면 요약·위험·증거 하이라이트가 이곳에 정리됩니다.
        </div>
      )}
    </div>
  );
}

export default ReportDraftPanel;
