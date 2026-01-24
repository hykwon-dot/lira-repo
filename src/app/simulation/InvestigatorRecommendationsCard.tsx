"use client";

import { useState, useEffect } from "react";
import type { CSSProperties, ElementType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FiAward,
  FiUser,
  FiMapPin,
  FiTrendingUp,
  FiBriefcase,
  FiStar,
  FiMail,
  FiTarget,
  FiCompass,
  FiX,
} from "react-icons/fi";

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
  alignmentFactors: string[];
  matchScore: number;
  successProbability: number;
  confidence: number;
}

interface InvestigatorRecommendationsCardProps {
  recommendations: InvestigatorRecommendation[];
  isLoading?: boolean;
  scenarioTitle?: string;
  onMatchNow?: (recommendation: InvestigatorRecommendation) => void;
  matchButtonLabel?: string;
  isMatchDisabled?: boolean;
}

const clampStyle = (lines: number): CSSProperties => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rankHighlights = [
  {
    badge: "즉시 투입",
    tone: "from-indigo-500 via-blue-500 to-sky-500",
    headline: "1순위 추천",
    description: "사건 핵심과 전문 분야가 완벽히 맞물려요.",
  },
  {
    badge: "특화 경험",
    tone: "from-blue-500 via-sky-500 to-cyan-500",
    headline: "대안 계획",
    description: "비슷한 유형에서 높은 해결률을 보여왔어요.",
  },
  {
    badge: "확장 옵션",
    tone: "from-slate-500 via-slate-400 to-slate-300",
    headline: "지원형",
    description: "다각도 분석과 리포팅에 강점을 지녔어요.",
  },
];

export const InvestigatorRecommendationsCard = ({
  recommendations,
  isLoading = false,
  scenarioTitle,
  onMatchNow,
  matchButtonLabel = "바로 매칭하기",
  isMatchDisabled = false,
}: InvestigatorRecommendationsCardProps) => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<InvestigatorRecommendation | null>(null);

  useEffect(() => {
    if (selectedRecommendation) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedRecommendation]);

  const openDetail = (recommendation: InvestigatorRecommendation) => {
    setSelectedRecommendation(recommendation);
  };

  const closeDetail = () => {
    setSelectedRecommendation(null);
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2">
            <span className="h-8 w-8 rounded-full bg-indigo-100/70" />
            <span className="h-3 w-28 rounded-full bg-slate-200" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((idx) => (
              <div
                key={`loading-rec-${idx}`}
                className="h-24 rounded-2xl border border-slate-200/70 bg-slate-100/60"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm text-slate-500">
        아직 추천할 탐정 데이터를 찾지 못했습니다. 대화를 이어가거나 조건을 더 입력해보세요.
      </div>
    );
  }

  const heading = scenarioTitle
    ? `"${scenarioTitle}" 사건에 최적화된 탐정 추천`
    : "탐정 추천 결과";
  const subheading = scenarioTitle
    ? "사건의 핵심 맥락과 탐정의 전문성을 교차 분석해 선별했어요."
    : "대화 기록과 실적 데이터를 바탕으로 최적의 파트너를 추천합니다.";

  const selectedIndex = selectedRecommendation
    ? recommendations.findIndex((item) => item.id === selectedRecommendation.id)
    : -1;

  return (
    <>
      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white/98 p-6 shadow-sm">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
            <FiAward className="h-3.5 w-3.5" /> 추천 탐정
          </span>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-900">{heading}</h3>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              총 {recommendations.length}명
            </span>
          </div>
          <p className="text-xs text-slate-500">{subheading}</p>
        </motion.header>

        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const meta = rankHighlights[Math.min(index, rankHighlights.length - 1)];
            const specialties = (rec.specialties ?? []).filter(
              (item): item is string => Boolean(item && item.trim().length > 0),
            );
            const topSpecialties = specialties.slice(0, 2);
            const moreSpecialtyCount = Math.max(0, specialties.length - topSpecialties.length);
            const successPercent = Math.round(clamp(rec.successProbability ?? 0.62, 0, 0.99) * 100);
            const confidencePercent = Math.round(clamp(rec.confidence ?? 0.72, 0.4, 0.99) * 100);

            const metrics: Array<{
              id: string;
              label: string;
              value: string;
              icon: ElementType;
            }> = [
              {
                id: "experience",
                label: "경력",
                value: `${rec.experienceYears}년`,
                icon: FiBriefcase,
              },
            ];

            if (typeof rec.rating === "number") {
              metrics.push({
                id: "rating",
                label: "평점",
                value: rec.rating.toFixed(1),
                icon: FiStar,
              });
            }

            if (typeof rec.successRate === "number") {
              metrics.push({
                id: "success",
                label: "성공률",
                value: `${rec.successRate.toFixed(1)}%`,
                icon: FiTrendingUp,
              });
            }

            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                      <FiUser className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="break-words text-base font-semibold text-slate-900">
                          {rec.name}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${meta.tone} px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white`}
                        >
                          <FiTarget className="h-3 w-3" /> TOP {index + 1}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                          <FiCompass className="h-3 w-3 text-indigo-500" />
                          {meta.headline}
                        </span>
                        <span className="hidden text-slate-400 sm:inline">·</span>
                        <span className="text-slate-500">{meta.description}</span>
                      </div>
                    </div>
                  </div>

                  {rec.email ? (
                    <a
                      href={`mailto:${rec.email}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                    >
                      <FiMail className="h-3.5 w-3.5" />
                      {rec.email}
                    </a>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {rec.serviceArea ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                      <FiMapPin className="h-3 w-3" />
                      {rec.serviceArea}
                    </span>
                  ) : null}
                  {topSpecialties.map((specialty) => (
                    <span
                      key={`${rec.id}-${specialty}`}
                      className="inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-indigo-600"
                    >
                      #{specialty}
                    </span>
                  ))}
                  {moreSpecialtyCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-slate-500">
                      +{moreSpecialtyCount}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-700">
                    <p className="font-semibold uppercase tracking-[0.18em] text-indigo-400">AI 매칭 지수</p>
                    <p className="mt-1 text-lg font-semibold text-indigo-700">{Math.round(rec.matchScore ?? 72)} / 100</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
                    <p className="font-semibold uppercase tracking-[0.18em] text-emerald-400">예상 성공률</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-700">{successPercent}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    <p className="font-semibold uppercase tracking-[0.18em] text-slate-400">데이터 신뢰도</p>
                    <p className="mt-1 text-lg font-semibold text-slate-700">{confidencePercent}%</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {metrics.map((metric) => {
                    const MetricIcon = metric.icon;
                    return (
                      <span
                        key={metric.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        <MetricIcon className="h-3.5 w-3.5" />
                        {metric.label} {metric.value}
                      </span>
                    );
                  })}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600" style={clampStyle(3)}>
                  {rec.reason}
                </p>

                {rec.alignmentFactors.length ? (
                  <ul className="mt-3 space-y-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[12px] text-slate-600">
                    {rec.alignmentFactors.slice(0, 4).map((factor, factorIndex) => (
                      <li key={`factor-${rec.id}-${factorIndex}`}>• {factor}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => openDetail(rec)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
                  >
                    상세 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => onMatchNow?.(rec)}
                    disabled={!onMatchNow || isMatchDisabled}
                    title={!onMatchNow
                      ? "추천 로딩이 완료되면 매칭을 진행할 수 있습니다."
                      : isMatchDisabled
                        ? "민간조사원 계정에서는 매칭을 진행할 수 없습니다."
                        : undefined}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:via-blue-500 hover:to-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-600"
                  >
                    {matchButtonLabel}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedRecommendation
          ? (() => {
              const modalSpecialties = (selectedRecommendation.specialties ?? []).filter(
                (item): item is string => Boolean(item && item.trim().length > 0),
              );
              const modalMeta = rankHighlights[Math.min(Math.max(selectedIndex, 0), rankHighlights.length - 1)];
              const detailSuccessPercent = Math.round(
                clamp(selectedRecommendation.successProbability ?? 0.62, 0, 0.99) * 100,
              );
              const detailConfidencePercent = Math.round(
                clamp(selectedRecommendation.confidence ?? 0.72, 0.4, 0.99) * 100,
              );

              return (
                <motion.div
                  key="recommendation-detail"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/60"
                    onClick={closeDetail}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ duration: 0.18 }}
                    className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white/98 p-6 shadow-2xl"
                  >
                    <button
                      type="button"
                      onClick={closeDetail}
                      className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <FiX className="h-4 w-4" />
                    </button>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow">
                          <FiCompass className="h-3 w-3" /> {modalMeta.badge}
                        </span>
                        <div className="flex items-start gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                            <FiUser className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 space-y-1">
                            <h3 className="break-words text-lg font-semibold text-slate-900">
                              {selectedRecommendation.name}
                            </h3>
                            <p className="text-xs text-slate-500">{modalMeta.description}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              {selectedRecommendation.email ? (
                                <a
                                  href={`mailto:${selectedRecommendation.email}`}
                                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 hover:border-indigo-200 hover:text-indigo-600"
                                >
                                  <FiMail className="h-3.5 w-3.5" />
                                  {selectedRecommendation.email}
                                </a>
                              ) : null}
                              {selectedRecommendation.serviceArea ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                                  <FiMapPin className="h-3 w-3" />
                                  {selectedRecommendation.serviceArea}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-900 md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                            AI 매칭 지수
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-indigo-700">
                            {Math.round(selectedRecommendation.matchScore ?? 72)} / 100
                          </p>
                          <p className="mt-3 text-xs text-indigo-500">
                            예상 성공률 {detailSuccessPercent}% · 데이터 신뢰도 {detailConfidencePercent}%
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            핵심 지표
                          </p>
                          <div className="mt-3 space-y-2">
                            <p className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-2 text-slate-500">
                                <FiBriefcase className="h-4 w-4" /> 경력
                              </span>
                              <span className="font-semibold text-slate-800">
                                {selectedRecommendation.experienceYears}년
                              </span>
                            </p>
                            {typeof selectedRecommendation.rating === "number" ? (
                              <p className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 text-slate-500">
                                  <FiStar className="h-4 w-4" /> 평균 평점
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {selectedRecommendation.rating.toFixed(1)}
                                </span>
                              </p>
                            ) : null}
                            {typeof selectedRecommendation.successRate === "number" ? (
                              <p className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-2 text-slate-500">
                                  <FiTrendingUp className="h-4 w-4" /> 성공률
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {selectedRecommendation.successRate.toFixed(1)}%
                                </span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                            전문 분야
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                            {modalSpecialties.length ? (
                              modalSpecialties.map((specialty) => (
                                <span
                                  key={`${selectedRecommendation.id}-modal-${specialty}`}
                                  className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-indigo-600"
                                >
                                  #{specialty}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-dashed border-indigo-200 px-3 py-1 text-indigo-400">
                                등록된 전문 분야 정보가 없습니다.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {selectedRecommendation.alignmentFactors.length ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                            매칭 근거
                          </p>
                          <ul className="mt-3 space-y-2">
                            {selectedRecommendation.alignmentFactors.map((factor, factorIndex) => (
                              <li key={`detail-factor-${factorIndex}`} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                                <span className="text-slate-700">{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                          추천 사유
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {selectedRecommendation.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={closeDetail}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-300"
                        >
                          닫기
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onMatchNow && !isMatchDisabled) {
                              onMatchNow(selectedRecommendation);
                              closeDetail();
                            }
                          }}
                          disabled={!onMatchNow || isMatchDisabled}
                          title={!onMatchNow
                            ? "추천 로딩이 완료되면 매칭을 진행할 수 있습니다."
                            : isMatchDisabled
                              ? "민간조사원 계정에서는 매칭을 진행할 수 없습니다."
                              : undefined}
                          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:via-blue-500 hover:to-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-300 disabled:text-slate-600"
                        >
                          {matchButtonLabel}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              );
            })()
          : null}
      </AnimatePresence>
    </>
  );
};
