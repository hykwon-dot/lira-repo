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
  FiShield,
  FiPieChart,
} from "react-icons/fi";
import { motion } from "framer-motion";
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

const riskGradient: Record<"low" | "medium" | "high", string> = {
  low: "from-emerald-500 to-teal-400",
  medium: "from-amber-500 to-orange-400",
  high: "from-rose-500 to-red-400",
};

const riskShadow: Record<"low" | "medium" | "high", string> = {
  low: "shadow-emerald-200",
  medium: "shadow-amber-200",
  high: "shadow-rose-200",
};

const phaseLabel: Record<"p0" | "p1" | "backup", string> = {
  p0: "P0 · 즉시",
  p1: "P1 · 우선",
  backup: "대안",
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
      return `${date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return null;
    }
  }, [insights?.generatedAt]);

  const isInvestigatorView = showInvestigatorInsights;
  const overallRisk = insights?.overallRisk ?? "low";
  
  // Calculate relative width for risk bar (0-100 logic roughly)
  const riskScore = insights?.riskScore ?? 0;
  const riskPercent = Math.min(100, Math.max(0, riskScore));

  const SectionHeader = ({ icon: Icon, title, color = "text-slate-900" }: { icon: any, title: string, color?: string }) => (
    <div className="flex items-center gap-2 mb-3">
      <span className={`flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h3 className="text-sm font-bold text-slate-800 tracking-wide">{title}</h3>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* 1. Risk Dashboard Widget */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {isLoading && (
          <div className="absolute right-4 top-4">
             <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600 animate-pulse">
                <FiCpu className="h-3 w-3" /> 분석 중
             </span>
          </div>
        )}
        
        <div className="mb-4 flex items-center justify-between">
            <div>
                 <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Security Level</span>
                 <div className="flex items-baseline gap-2 mt-0.5">
                    <h2 className="text-2xl font-extrabold text-slate-900">{riskScore} <span className="text-sm font-medium text-slate-400">/ 100</span></h2>
                 </div>
            </div>
            <div className="text-right">
                 <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-md ${riskGradient[overallRisk]} ${riskShadow[overallRisk]}`}>
                    <FiShield className="h-3.5 w-3.5" />
                    {overallRisk === 'high' ? '위험' : overallRisk === 'medium' ? '주의' : '안전'}
                 </span>
                 <p className="mt-1 text-[10px] text-slate-400">{formattedTimestamp ? `Update ${formattedTimestamp}` : "Waiting..."}</p>
            </div>
        </div>

        {/* Risk Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
           <motion.div 
             className={`h-full bg-gradient-to-r ${riskGradient[overallRisk]}`}
             initial={{ width: 0 }}
             animate={{ width: `${riskPercent}%` }}
             transition={{ duration: 1, ease: "easeOut" }}
           />
        </div>
        
        <p className="mt-4 text-[13px] font-medium leading-relaxed text-slate-600">
            {insights?.summary ?? "대화 내용을 분석하여 실시간 위협 수준을 진단합니다."}
        </p>

        {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-600">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
            </div>
        )}

        {onRetry && (
            <button onClick={onRetry} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                AI 분석 재시도
            </button>
        )}
      </section>

      {/* 2. Investigator / Customer Slot */}
      {(investigatorSlot || customerRecommendationsSlot) && (
        <section>
             <SectionHeader icon={FiActivity} title="AI 탐정 매칭" color="text-indigo-600" />
             <div className="space-y-4">
               {isInvestigatorView && investigatorSlot ? investigatorSlot : null}
               {!isInvestigatorView && customerRecommendationsSlot ? customerRecommendationsSlot : null}
             </div>
        </section>
      )}

      {/* 3. Follow-up Questions (Chips style) */}
      <section>
         <SectionHeader icon={FiHelpCircle} title="추가 확인 제안" color="text-violet-600" />
         <div className="flex flex-col gap-2">
            {insights?.followUpQuestions?.length ? (
                insights.followUpQuestions.map((q, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i} 
                        className="group flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-100 hover:shadow-sm px-4 py-3 transition-all"
                    >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">Q{i+1}</span>
                        <p className="text-[12px] font-medium text-slate-600 group-hover:text-slate-800">{q}</p>
                    </motion.div>
                ))
            ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                    분석 데이터가 충분해지면 추천 질문이 표시됩니다.
                </div>
            )}
         </div>
      </section>

        {/* 4. Alerts (Card style) */}
        {insights?.alerts?.length ? (
            <section>
                <SectionHeader icon={FiBell} title="트렌드 경보" color="text-amber-500" />
                <div className="space-y-3">
                    {insights.alerts.map((alert) => (
                        <div key={alert.id} className="relative overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                             <div className="absolute left-0 top-0 h-full w-1 bg-amber-400" />
                             <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[13px] font-bold text-slate-800">{alert.title}</h4>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-tight text-amber-600 shadow-sm border border-amber-100">
                                    {alert.severity === 'high' ? 'CRITICAL' : 'WARNING'}
                                </span>
                             </div>
                             <p className="text-[12px] text-slate-600 leading-relaxed">{alert.message}</p>
                        </div>
                    ))}
                </div>
            </section>
        ) : null}

      {/* 5. Phase / Action Plan (Timeline style) */}
      <section>
        <SectionHeader icon={FiCheckSquare} title="실행 가이드" color="text-emerald-600" />
        
        {insights?.actionPlan?.items?.length ? (
             <div className="relative space-y-0 pl-3">
                {/* Timeline Line */}
                <div className="absolute left-[19px] top-2 h-[calc(100%-16px)] w-[2px] bg-slate-100"></div>
                
                {insights.actionPlan.items.map((item, idx) => (
                    <motion.div 
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pb-6 pl-8"
                    >
                         {/* Dot */}
                         <span className={`absolute left-[13px] top-[2px] h-3.5 w-3.5 rounded-full border-2 border-white ring-1 ring-slate-200 ${item.phase === 'p0' ? 'bg-rose-500' : item.phase === 'p1' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                         
                         <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${item.phase === 'p0' ? 'text-rose-600' : 'text-indigo-600'}`}>
                                    {phaseLabel[item.phase]}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                    {item.dueInHours ? `${item.dueInHours}H` : 'TBD'}
                                </span>
                            </div>
                            <h4 className="text-[13px] font-bold text-slate-900 mb-1">{item.label}</h4>
                            <p className="text-[12px] text-slate-500 leading-relaxed mb-2">{item.description}</p>
                            
                            {item.relatedSignals?.length ? (
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-50">
                                    {item.relatedSignals.map(sig => (
                                        <span key={sig} className="inline-flex items-center bg-slate-50 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500">
                                            #{sig}
                                        </span>
                                    ))}
                                </div>
                            ) : null}
                         </div>
                    </motion.div>
                ))}
             </div>
        ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-slate-50/50">
               대화가 진행되면 단계별 실행 계획이 수립됩니다.
            </div>
        )}
      </section>

      {/* 6. Similar Cases */}
        <section>
          <SectionHeader icon={FiPieChart} title="유사 사례 분석" color="text-sky-600" />
            <div className="space-y-3">
                {insights?.recommendations?.length ? (
                    insights.recommendations.map((rec) => (
                        <div key={rec.id} className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-sky-200 hover:shadow-md">
                            <div className="flex items-center justify-between mb-2">
                                <h5 className="text-[12px] font-bold text-slate-800 line-clamp-1">{rec.title}</h5>
                                <span className="text-[10px] font-bold text-sky-600">{Math.round(rec.similarity * 100)}% 일치</span>
                            </div>
                             <p className="text-[11px] text-slate-500 line-clamp-2">{rec.summary}</p>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-center text-[11px] text-slate-400">
                        데이터베이스에서 유사한 사례를 검색하고 있습니다.
                    </div>
                )}
            </div>
      </section>

        {!isInvestigatorView && !customerRecommendationsSlot && gatedNotice ? (
            <div className="mt-4">
                {gatedNotice}
            </div>
        ) : null}

    </div>
  );
}

export default AIInsightsPanel;