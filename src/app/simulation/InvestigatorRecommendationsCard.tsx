"use client";

import { motion } from "framer-motion";
import { FiAward, FiUser, FiMapPin, FiTrendingUp } from "react-icons/fi";

export interface InvestigatorRecommendation {
  id: number;
  investigatorId: number;
  userId: number | null;
  name: string;
  email: string | null;
  rating: number | null;
  successRate: number | null;
  experienceYears: number;
  serviceArea: string | null;
  specialties: string[];
  reason: string;
}

interface InvestigatorRecommendationsCardProps {
  recommendations: InvestigatorRecommendation[];
  isLoading?: boolean;
  scenarioTitle?: string;
  onMatchNow?: (recommendation: InvestigatorRecommendation) => void;
  matchButtonLabel?: string;
  isMatchDisabled?: boolean;
}

export const InvestigatorRecommendationsCard = ({
  recommendations,
  isLoading = false,
  scenarioTitle,
  onMatchNow,
  matchButtonLabel = '바로 매칭하기',
  isMatchDisabled = false,
}: InvestigatorRecommendationsCardProps) => {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/90 p-6 shadow-sm">
        <div className="animate-pulse space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-100/60" />
            <div className="h-3 w-40 rounded-full bg-slate-200/70" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((idx) => (
              <div key={`loading-rec-${idx}`} className="h-24 rounded-2xl border border-slate-200/70 bg-slate-100/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">
        아직 추천할 탐정 데이터를 찾지 못했습니다. 대화를 이어가거나 조건을 더 입력해보세요.
      </div>
    );
  }

  const heading = scenarioTitle ? `추천 탐정 · "${scenarioTitle}"` : "추천 탐정";

  return (
    <div className="rounded-3xl border border-white/10 bg-white/95 p-6 shadow-lg">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-inner">
            <FiAward className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{heading}</h3>
            <p className="text-xs text-slate-500">AI가 사건 적합도, 전문 분야, 수행 실적을 기준으로 상위 후보를 선별했습니다.</p>
          </div>
        </div>
        <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-500">
          상위 {recommendations.length}명 추천
        </span>
      </div>

      <div className="mt-5 space-y-4">
        {recommendations.map((rec, idx) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-5 shadow-sm"
          >
            <div className="absolute right-5 top-5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-500">
              TOP {idx + 1}
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                    <FiUser className="h-4 w-4" />
                  </span>
                  {rec.name}
                </h4>
                {rec.email && <p className="text-xs text-slate-500">{rec.email}</p>}
                {rec.serviceArea ? (
                  <p className="flex items-center gap-1 text-xs text-slate-500">
                    <FiMapPin className="h-3 w-3" /> 활동 지역: {rec.serviceArea}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2 text-right text-xs text-slate-500">
                {typeof rec.rating === "number" ? (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                    평점 {rec.rating.toFixed(1)}
                  </span>
                ) : null}
                {typeof rec.successRate === "number" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    <FiTrendingUp className="h-3 w-3" /> 성공률 {rec.successRate.toFixed(1)}%
                  </span>
                ) : null}
                <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-slate-100 shadow">경력 {rec.experienceYears}년</span>
              </div>
            </div>
            {rec.specialties && rec.specialties.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                {rec.specialties.slice(0, 5).map((specialty) => (
                  <span key={specialty} className="rounded-full bg-white px-3 py-1 border border-slate-200">
                    #{specialty}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-indigo-400">추천 사유</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{rec.reason}</p>
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                추천 탐정에게 바로 의뢰서를 전달하거나, 상세 상담 요청으로 협업 조건을 조율할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={() => onMatchNow?.(rec)}
                disabled={!onMatchNow || isMatchDisabled}
                title={!onMatchNow
                  ? '추천 로딩이 완료되면 매칭을 진행할 수 있습니다.'
                  : isMatchDisabled
                    ? '민간조사원 계정에서는 매칭을 진행할 수 없습니다.'
                    : undefined}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow transition hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {matchButtonLabel}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
