"use client";

import { useMemo, type ReactNode } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowRight,
  FiBell,
  FiCheckCircle,
  FiCheckSquare,
  FiClock,
  FiCpu,
  FiHelpCircle,
  FiGitBranch,
  FiTrendingUp,
} from "react-icons/fi";
import type { AiRealtimeInsights } from "@/lib/ai/types";

interface AIInsightsPanelProps {
  insights: AiRealtimeInsights | null;
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  showInvestigatorInsights?: boolean;
  investigatorSlot?: ReactNode;
  gatedNotice?: ReactNode;
  customerRecommendationsSlot?: ReactNode;
}

const riskBadgeStyle: Record<"low" | "medium" | "high", string> = {
  low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  high: "bg-rose-100 text-rose-700 border-rose-200",
};

const phaseLabel: Record<"p0" | "p1" | "backup", string> = {
  p0: "P0 · 즉시 조치",
  p1: "P1 · 우선 조치",
  backup: "Backup · 대안 시나리오",
};

export function AIInsightsPanel({
  insights,
  isLoading,
  error,
  onRetry,
  showInvestigatorInsights = false,
  investigatorSlot,
  gatedNotice,
  customerRecommendationsSlot,
}: AIInsightsPanelProps) {
  const formattedTimestamp = useMemo(() => {
    if (!insights?.generatedAt) return null;
    try {
      const date = new Date(insights.generatedAt);
      return `${date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} ${date
        .toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
        .replace(/:/, "시 ")}분`;
    } catch {
      return null;
    }
  }, [insights?.generatedAt]);

  const isInvestigatorView = showInvestigatorInsights;
  const investigatorOnlyNotice = gatedNotice ?? (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
      <p className="text-xs font-semibold text-slate-600">탐정 전용 심층 인사이트</p>
      <p className="mt-1 leading-relaxed">
        승인된 민간조사원 계정으로 접속하면 트렌드 경보, 내부 체크리스트, 협상 전략 등 추가 정보를 확인할 수 있습니다.
      </p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-slate-200/70 bg-gradient-to-br from-slate-50 via-white to-white p-5 shadow-inner">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">실시간 위험 지표</p>
            <div className="mt-2 flex items-end gap-3">
              <div className="flex items-center gap-2 text-3xl font-bold text-slate-900">
                <FiActivity className="h-7 w-7 text-indigo-500" />
                {insights ? insights.riskScore : "--"}
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold ${riskBadgeStyle[insights?.overallRisk ?? "low"]}`}
              >
                {insights?.overallRisk === "high"
                  ? "높음"
                  : insights?.overallRisk === "medium"
                  ? "중간"
                  : "낮음"}
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p className="flex items-center justify-end gap-1">
              <FiClock className="h-3.5 w-3.5" />
              {formattedTimestamp ? formattedTimestamp : "대기 중"}
            </p>
            {isLoading ? (
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-600">
                <FiCpu className="h-3 w-3 animate-spin" /> 분석 중
              </p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
          {insights?.summary ?? "대화가 진행되면 위험도와 우선 조치가 자동으로 업데이트됩니다."}
        </p>
        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-2 text-[12px] text-rose-600">
            <FiAlertCircle className="mt-0.5 h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : null}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            다시 분석
            <FiArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-4">
        {isInvestigatorView && investigatorSlot ? (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FiActivity className="h-4 w-4 text-indigo-500" /> 탐정 추천
            </h3>
            <div className="mt-2 space-y-3">{investigatorSlot}</div>
          </div>
        ) : null}

        {!isInvestigatorView && customerRecommendationsSlot ? (
          <div className="space-y-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FiActivity className="h-4 w-4 text-indigo-500" /> 탐정 추천
              </h3>
              <div className="mt-2 space-y-3">{customerRecommendationsSlot}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
              <p className="text-xs font-semibold text-slate-600">전문가 심화 인사이트</p>
              <p className="mt-1 leading-relaxed">
                트렌드 경보, 내부 체크리스트, 협상 전략 등은 사건을 담당한 민간조사원과 관리자 전용으로 제공됩니다.
              </p>
            </div>
          </div>
        ) : null}

        {isInvestigatorView ? (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FiBell className="h-4 w-4 text-amber-500" /> 트렌드 기반 알림
            </h3>
            <div className="mt-2 space-y-2">
              {insights?.alerts?.length ? (
                insights.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[12px] text-amber-700 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-amber-800">{alert.title}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadgeStyle[alert.severity]}`}>
                        {alert.severity === "high" ? "긴급" : alert.severity === "medium" ? "주의" : "관찰"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-amber-600">{alert.message}</p>
                    <p className="mt-2 leading-relaxed text-amber-700">{alert.suggestion}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
                  아직 표시할 트렌드 경보가 없습니다.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiHelpCircle className="h-4 w-4 text-indigo-500" /> 추가 확인 질문
          </h3>
          <div className="mt-2 space-y-2">
            {insights?.followUpQuestions?.length ? (
              insights.followUpQuestions.map((question, index) => (
                <div
                  key={`follow-up-${index}`}
                  className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                >
                  <p className="font-semibold text-indigo-600">Q{index + 1}.</p>
                  <p className="mt-1 leading-relaxed text-slate-700">{question}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
                추가로 안내할 질문이 생성되면 이곳에 표시됩니다.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiAlertTriangle className="h-4 w-4 text-rose-500" /> 감지된 경보
          </h3>
          <div className="mt-2 space-y-2">
            {insights?.signals?.length
              ? insights.signals.map((signal) => (
                  <div
                    key={signal.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{signal.title}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadgeStyle[signal.severity]}`}>
                        {signal.severity === "high" ? "긴급" : signal.severity === "medium" ? "주의" : "관찰"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">증거 키워드: {signal.evidence}</p>
                    <p className="mt-2 text-[12px] leading-relaxed text-slate-600">{signal.guidance}</p>
                  </div>
                ))
              : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
                    감지된 리스크 신호가 없습니다.
                  </p>
                )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiTrendingUp className="h-4 w-4 text-indigo-500" /> 예상 타임라인
          </h3>
          <ol className="mt-2 space-y-2">
            {insights?.timeline?.map((step) => (
              <li
                key={step.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{step.label}</span>
                  <span className="text-[11px] text-slate-400">
                    {step.status === "completed"
                      ? "완료"
                      : step.status === "in-progress"
                      ? `진행 중 · ${step.etaDays ?? "--"}일 내`
                      : `예상 ${step.etaDays ?? "--"}일`}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed">{step.rationale}</p>
              </li>
            )) ?? null}
          </ol>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiGitBranch className="h-4 w-4 text-violet-500" /> 조사 흐름 시뮬레이션
          </h3>
          {insights?.flowSimulation ? (
            <div className="mt-2 space-y-3">
              <div className="rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-[12px] text-violet-700">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">예상 소요</p>
                <p className="mt-1 text-sm font-semibold text-violet-700">
                  총 {insights.flowSimulation.totalDurationDays}일 내
                </p>
                {insights.flowSimulation.recommendedCheckpoints.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-violet-600">
                    {insights.flowSimulation.recommendedCheckpoints.map((checkpoint, index) => (
                      <li key={`checkpoint-${index}`}>{checkpoint}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="space-y-2">
                {insights.flowSimulation.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">{phase.name}</span>
                      <span className="text-[11px] text-slate-400">~{phase.durationDays}일 · 신뢰도 {Math.round(phase.confidence * 100)}%</span>
                    </div>
                    <p className="mt-1 leading-relaxed">{phase.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-500">
                        필요 역할: {phase.requiredRoles.join(", ")}
                      </span>
                      {phase.status === "critical" ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 font-semibold text-rose-600">
                          중요 단계
                        </span>
                      ) : phase.status === "parallel" ? (
                        <span className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 font-semibold text-teal-600">
                          병행 진행
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              {insights.flowSimulation.resourceNotes.length ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">리소스 메모</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {insights.flowSimulation.resourceNotes.map((note, index) => (
                      <li key={`resource-note-${index}`}>{note}</li>
                    ))}
                  </ul>
                  {insights.flowSimulation.riskNotes.length ? (
                    <>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-rose-400">리스크 주의</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-rose-500">
                        {insights.flowSimulation.riskNotes.map((note, index) => (
                          <li key={`risk-note-${index}`}>{note}</li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
              위험 분석을 기반으로 한 흐름 시뮬레이션이 생성되면 이곳에 표시됩니다.
            </p>
          )}
        </div>

        {isInvestigatorView ? (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FiCheckCircle className="h-4 w-4 text-emerald-500" /> 다음 행동 제안
            </h3>
            <div className="mt-2 space-y-2">
              {insights?.nextActions?.map((action) => (
                <div
                  key={action.id}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{action.label}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskBadgeStyle[action.priority]}`}>
                      {action.priority === "high" ? "최우선" : action.priority === "medium" ? "중요" : "선택"}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed">{action.description}</p>
                </div>
              )) ?? null}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiCheckSquare className="h-4 w-4 text-slate-700" /> 실행 계획
          </h3>
          <div className="mt-2 space-y-3">
            {insights?.actionPlan ? (
              <>
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-[12px] text-indigo-700">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">핵심 포커스</p>
                  <p className="mt-1 text-sm font-semibold text-indigo-700">{insights.actionPlan.focus}</p>
                  <p className="mt-2 leading-relaxed text-indigo-600">{insights.actionPlan.notes}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">성공 기준</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {insights.actionPlan.successCriteria.map((criterion, index) => (
                      <li key={`criterion-${index}`}>{criterion}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  {insights.actionPlan.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-500">
                          {phaseLabel[item.phase]}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {item.dueInHours ? `~${item.dueInHours}시간` : "일정 협의"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 leading-relaxed">{item.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        {item.ownerHint ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-semibold text-slate-500">
                            담당: {item.ownerHint}
                          </span>
                        ) : null}
                        {item.relatedSignals?.length ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-600">
                            연관 경보: {item.relatedSignals.join(", ")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
                대화가 더 진행되면 실행 계획이 생성됩니다.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiCpu className="h-4 w-4 text-slate-500" /> 유사 시나리오 추천
          </h3>
          <div className="mt-2 space-y-2">
            {insights?.recommendations?.length
              ? insights.recommendations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[12px] text-slate-600 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">{item.title}</span>
                      <span className="text-[11px] font-semibold text-indigo-500">{Math.round(item.similarity * 100)}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{item.highlight}</p>
                    <p className="mt-2 leading-relaxed text-slate-600">{item.summary}</p>
                  </div>
                ))
              : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[12px] text-slate-400">
                    아직 추천 가능한 시나리오가 없습니다.
                  </p>
                )}
          </div>
        </div>

        {!isInvestigatorView && !customerRecommendationsSlot ? investigatorOnlyNotice : null}
      </div>
    </div>
  );
}

export default AIInsightsPanel;
