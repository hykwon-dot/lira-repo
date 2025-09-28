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
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full border-2 border-blue-200 flex items-center justify-center">
            <FiAward className="h-6 w-6 text-blue-500 animate-pulse" />
          </div>
          <div>
            <p className="text-sm text-slate-500">시나리오에 맞는 탐정을 분석 중입니다...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500">
        아직 추천할 탐정 데이터를 찾지 못했습니다.
      </div>
    );
  }

  const heading = scenarioTitle ? `추천 탐정 ("${scenarioTitle}" 기반)` : "추천 탐정";

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full border-2 border-blue-200 flex items-center justify-center bg-blue-50">
            <FiAward className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{heading}</h3>
            <p className="text-xs text-slate-500">점수 기반 상위 3명의 민간조사원을 추천해 드립니다.</p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-600">{idx + 1}위 추천</span>
                <h4 className="mt-2 text-base font-semibold text-slate-800 flex items-center gap-2">
                  <FiUser className="h-4 w-4 text-slate-400" />
                  {rec.name}
                </h4>
                {rec.email && <p className="text-xs text-slate-500">{rec.email}</p>}
              </div>
              {rec.rating ? (
                <div className="text-right">
                  <p className="text-sm font-semibold text-blue-600">평점 {rec.rating.toFixed(1)} / 5</p>
                  {rec.successRate ? (
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <FiTrendingUp className="h-3 w-3" /> 성공률 {rec.successRate.toFixed(1)}%
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {rec.specialties && rec.specialties.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                {rec.specialties.slice(0, 5).map((specialty) => (
                  <span key={specialty} className="rounded-full bg-white px-3 py-1 border border-slate-200">
                    #{specialty}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-500">추천 사유</p>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{rec.reason}</p>
            </div>
            {rec.serviceArea ? (
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                <FiMapPin className="h-3 w-3" /> 활동 지역: {rec.serviceArea}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                추천된 탐정과 바로 사건 의뢰서를 작성해보세요. 필요한 경우 매칭 후 세부 조건을 조율할 수 있습니다.
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
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
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
