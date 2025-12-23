"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CASE_STATUS_META, CaseStatusKey } from "@/lib/investigationWorkflow";
import { extractTimelinePayloadText, getTimelineMeta } from "@/lib/timelineMeta";
import { useUserStore } from "@/lib/userStore";
import { Star } from "lucide-react";
import AIInsightsPanel from "@/app/simulation/AIInsightsPanel";
import ReportDraftPanel from "@/app/simulation/ReportDraftPanel";
import NegotiationCoachPanel from "@/app/simulation/NegotiationCoachPanel";
import {
  InvestigatorRecommendationsCard,
  type InvestigatorRecommendation,
} from "@/app/simulation/InvestigatorRecommendationsCard";
import type {
  AiRealtimeInsights,
  AiInvestigationReportDraft,
  AiNegotiationCoachPlan,
} from "@/lib/ai/types";
import { FiAlertCircle, FiRefreshCcw } from "react-icons/fi";

interface TimelineEntry {
  id: number;
  type: string;
  title?: string | null;
  note?: string | null;
  payload?: unknown;
  createdAt: string;
  author?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface RequestDetail {
  id: number;
  title: string;
  details: string;
  desiredOutcome?: string | null;
  status: CaseStatusKey | string;
  scenario?: {
    id: number;
    title: string;
    category?: string | null;
    difficulty?: string | null;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
  investigator?: {
    id: number;
    status: string;
    contactPhone?: string | null;
    serviceArea?: string | null;
    specialties?: unknown;
    user?: {
      id: number;
      name: string;
      email: string;
    } | null;
  } | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEntry[];
  review?: {
    id: number;
    rating: number;
    comment?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
};

const toSpecialtyList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        if ("label" in item) {
          return String((item as Record<string, unknown>).label ?? "");
        }
        if ("value" in item) {
          return String((item as Record<string, unknown>).value ?? "");
        }
      }
      return JSON.stringify(item);
    });
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map((item) =>
      typeof item === "string" ? item : JSON.stringify(item),
    );
  }
  return [];
};

export default function InvestigationRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const token = useUserStore((state) => state.token);
  const currentUser = useUserStore((state) => state.user);

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [reviewState, setReviewState] = useState<{ rating: number; comment: string }>({ rating: 0, comment: "" });
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingIssues, setBriefingIssues] = useState({
    general: null as string | null,
    insights: null as string | null,
    report: null as string | null,
    negotiation: null as string | null,
    recommendations: null as string | null,
  });
  const [briefingInsights, setBriefingInsights] = useState<AiRealtimeInsights | null>(null);
  const [briefingReport, setBriefingReport] = useState<AiInvestigationReportDraft | null>(null);
  const [briefingPlan, setBriefingPlan] = useState<AiNegotiationCoachPlan | null>(null);
  const [briefingRecommendations, setBriefingRecommendations] = useState<InvestigatorRecommendation[]>([]);
  const [briefingRefreshKey, setBriefingRefreshKey] = useState(0);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4200);
    }
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const handleReviewSubmit = async () => {
    if (!request) return;
    if (!token) {
      pushToast("error", "로그인이 만료되었습니다. 다시 로그인해주세요.");
      router.push(`/login?redirect=${encodeURIComponent(`/investigation-requests/${request?.id ?? params?.id}`)}`);
      return;
    }

    if (reviewState.rating < 1 || reviewState.rating > 5) {
      pushToast("error", "평점을 1점에서 5점 사이로 선택해주세요.");
      return;
    }

    const payload = {
      rating: reviewState.rating,
      comment: reviewState.comment.trim().length > 0 ? reviewState.comment.trim() : null,
    };

    const isUpdate = Boolean(request.review);
    setSubmittingReview(true);

    try {
      const res = await fetch(`/api/investigation-requests/${request.id}/review`, {
        method: isUpdate ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || "평가를 저장하지 못했습니다.";
        pushToast("error", message);
        return;
      }

      setRequest((prev) => (prev ? { ...prev, review: data.review } : prev));
      setReviewState({
        rating: data.review?.rating ?? payload.rating,
        comment: data.review?.comment ?? payload.comment ?? "",
      });
      setIsEditingReview(false);
      pushToast("success", isUpdate ? "평가가 수정되었습니다." : "평가가 등록되었습니다.");
    } catch (err) {
      console.error(err);
      pushToast("error", "평가 저장 중 문제가 발생했습니다.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelReviewEdit = () => {
    if (request?.review) {
      setReviewState({
        rating: request.review.rating,
        comment: request.review.comment ?? "",
      });
      setIsEditingReview(false);
    } else {
      setReviewState({ rating: 0, comment: "" });
    }
  };

  useEffect(() => {
    const requestId = Number(params?.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      setError("잘못된 요청 ID입니다.");
      setLoading(false);
      return;
    }
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent(`/investigation-requests/${requestId}`)}`);
      return;
    }

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
            const res = await fetch(`/api/investigation-requests/${requestId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 404) {
          setError("해당 사건 의뢰를 찾을 수 없습니다.");
          pushToast("error", "사건 의뢰를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }
        if (res.status === 403) {
          setError("해당 사건에 접근할 권한이 없습니다.");
          pushToast("error", "접근 권한이 없습니다.");
          setLoading(false);
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          const message = data?.error || "사건 의뢰 정보를 불러오지 못했습니다.";
          setError(message);
          pushToast("error", message);
          setLoading(false);
          return;
        }
        const data: RequestDetail = await res.json();
        setRequest(data);
        setReviewState({
          rating: data.review?.rating ?? 0,
          comment: data.review?.comment ?? "",
        });
  const isRequestOwner = currentUser && data.user ? String(data.user.id) === String(currentUser.id) : false;
  const normalizedStatus = String(data.status ?? "").toUpperCase();
  const isCompleted = normalizedStatus === "COMPLETED";
        setIsEditingReview(!data.review && isRequestOwner && isCompleted);
      } catch (err) {
        console.error(err);
        const message = "사건 의뢰 정보를 불러오는 중 오류가 발생했습니다.";
        setError(message);
        pushToast("error", message);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [params?.id, router, token, currentUser]);

  const isAssignedInvestigator = useMemo(() => {
    if (!request?.investigator?.user || !currentUser) return false;
    if (currentUser.role !== "investigator") return false;
    return String(request.investigator.user.id) === String(currentUser.id);
  }, [currentUser, request?.investigator?.user]);

  const isAdminUser = useMemo(() => {
    if (!currentUser) return false;
    return currentUser.role === "admin" || currentUser.role === "super_admin";
  }, [currentUser]);

  const canViewInvestigatorPanels = Boolean(isAssignedInvestigator || isAdminUser);

  const showInvestigatorNotice = useMemo(() => {
    if (canViewInvestigatorPanels) return false;
    if (!request?.investigator?.user) return false;
    return true;
  }, [canViewInvestigatorPanels, request?.investigator?.user]);

  useEffect(() => {
    if (!canViewInvestigatorPanels || !request?.id || !token) {
      setBriefingLoading(false);
      setBriefingInsights(null);
      setBriefingReport(null);
      setBriefingPlan(null);
      setBriefingRecommendations([]);
      setBriefingIssues({
        general: null,
        insights: null,
        report: null,
        negotiation: null,
        recommendations: null,
      });
      return;
    }

    const controller = new AbortController();

    const loadBriefing = async () => {
      setBriefingLoading(true);
      setBriefingIssues((prev) => ({ ...prev, general: null }));

      try {
        const response = await fetch(`/api/investigation-requests/${request.id}/briefing`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          const message = typeof data?.error === "string" ? data.error : "AI 브리핑을 불러오지 못했습니다.";
          throw new Error(message);
        }

        const payload = await response.json();
        const issuesRaw = payload?.issues && typeof payload.issues === "object" ? (payload.issues as Record<string, unknown>) : {};

        setBriefingInsights(payload?.insights ?? null);
        setBriefingReport(payload?.report ?? null);
        setBriefingPlan(payload?.negotiationPlan ?? null);
        setBriefingRecommendations(
          Array.isArray(payload?.recommendations)
            ? (payload.recommendations as InvestigatorRecommendation[])
            : [],
        );
        setBriefingIssues({
          general: null,
          insights: typeof issuesRaw.insights === "string" ? issuesRaw.insights : null,
          report: typeof issuesRaw.report === "string" ? issuesRaw.report : null,
          negotiation: typeof issuesRaw.negotiation === "string" ? issuesRaw.negotiation : null,
          recommendations: typeof issuesRaw.recommendations === "string" ? issuesRaw.recommendations : null,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("[INVESTIGATOR_BRIEFING_FETCH_ERROR]", err);
        const message = err instanceof Error ? err.message : "AI 브리핑을 불러오지 못했습니다.";
        setBriefingInsights(null);
        setBriefingReport(null);
        setBriefingPlan(null);
        setBriefingRecommendations([]);
        setBriefingIssues({
          general: message,
          insights: message,
          report: message,
          negotiation: message,
          recommendations: message,
        });
      } finally {
        if (!controller.signal.aborted) {
          setBriefingLoading(false);
        }
      }
    };

    void loadBriefing();

    return () => controller.abort();
  }, [canViewInvestigatorPanels, request?.id, token, briefingRefreshKey]);

  const handleRefreshBriefing = useCallback(() => {
    setBriefingRefreshKey((prev) => prev + 1);
  }, []);

  const investigatorBriefingSlot = useMemo(() => {
    if (!canViewInvestigatorPanels) return null;
    return (
      <>
        <InvestigatorRecommendationsCard
          recommendations={briefingRecommendations}
          isLoading={briefingLoading}
          scenarioTitle={request?.title}
        />
        {briefingIssues.recommendations ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-700">
            <FiAlertCircle className="mt-0.5 h-4 w-4" />
            <span>{briefingIssues.recommendations}</span>
          </div>
        ) : null}
      </>
    );
  }, [briefingIssues.recommendations, briefingLoading, briefingRecommendations, canViewInvestigatorPanels, request?.title]);

  const statusKey = (request?.status as CaseStatusKey) ?? "MATCHING";
  const statusMeta = CASE_STATUS_META[statusKey] ?? CASE_STATUS_META.MATCHING;
  const specialtyList = useMemo(() => toSpecialtyList(request?.investigator?.specialties), [request?.investigator?.specialties]);
  const isOwner = request?.user && currentUser ? String(request.user.id) === String(currentUser.id) : false;
  const review = request?.review ?? null;
  const hasReview = Boolean(review);
  const canManageReview = isOwner && statusKey === "COMPLETED";

  return (
    <div className="min-h-screen bg-slate-50 pb-16 pt-12">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ring-1 ring-black/5 ${
                toast.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : toast.type === "error"
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : "border-sky-200 bg-sky-50 text-sky-700"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-base">{toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}</span>
                <div className="flex-1 leading-relaxed">{toast.message}</div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="pointer-events-auto text-xs text-slate-400 transition hover:text-slate-600"
                >
                  닫기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Link href="/investigation-requests" className="text-indigo-600 hover:text-indigo-700">← 사건 목록으로</Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50/90 p-6 text-sm text-rose-600">
            {error}
          </div>
        ) : request ? (
          <>
            <header className="rounded-3xl bg-white px-6 py-8 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                    {statusMeta.label}
                  </span>
                  <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">{request.title}</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    생성 {new Date(request.createdAt).toLocaleString("ko-KR")} · 최근 업데이트 {new Date(request.updatedAt).toLocaleString("ko-KR")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">의뢰자</p>
                  {request.user ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-slate-700">{request.user.name}</p>
                      <p>{request.user.email}</p>
                    </div>
                  ) : (
                    <p className="mt-2">정보 없음</p>
                  )}
                </div>
              </div>
            </header>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-[1.7fr_1fr]">
              <article className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1a2340]">사건 개요</h2>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{request.details}</p>
                {request.desiredOutcome && (
                  <div className="mt-4 rounded-2xl bg-slate-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Desired Outcome</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{request.desiredOutcome}</p>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                    <p className="text-xs font-semibold text-slate-500">예산 범위</p>
                    <p className="mt-2 text-base font-semibold text-slate-800">
                      {request.budgetMin ? request.budgetMin.toLocaleString("ko-KR") : "-"} ₩ ~ {request.budgetMax ? request.budgetMax.toLocaleString("ko-KR") : "-"} ₩
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                    <p className="text-xs font-semibold text-slate-500">연관 시나리오</p>
                    {request.scenario ? (
                      <div className="mt-2">
                        <p className="font-semibold text-slate-800">{request.scenario.title}</p>
                        <p className="text-xs text-slate-400">
                          {request.scenario.category ?? "카테고리 없음"}
                          {request.scenario.difficulty ? ` · ${request.scenario.difficulty}` : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2">연결된 시나리오가 없습니다.</p>
                    )}
                  </div>
                </div>
              </article>

              <aside className="flex flex-col gap-6">
                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#1a2340]">담당 민간조사원</h2>
                  {request.investigator?.user ? (
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p className="text-base font-semibold text-slate-800">{request.investigator.user.name}</p>
                      <p>{request.investigator.user.email}</p>
                      {request.investigator.contactPhone && <p>☎ {request.investigator.contactPhone}</p>}
                      {request.investigator.serviceArea && <p>활동 지역: {request.investigator.serviceArea}</p>}
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-500">전문 분야</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {specialtyList.length > 0 ? (
                            specialtyList.map((item, idx) => (
                              <span
                                key={`${request.investigator?.id}-specialty-${idx}`}
                                className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">등록된 정보 없음</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">아직 지정된 민간조사원이 없습니다.</p>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-[#1a2340]">채팅 & 협업</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    사건이 수락되면 전용 채팅방에서 민간조사원과 대화하고 증거를 공유할 수 있습니다.
                  </p>
                  <Link
                    href={`/investigation-requests/${request.id}/chat`}
                    className="mt-3 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
                  >
                    채팅방으로 이동 ↗
                  </Link>
                </div>
              </aside>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#1a2340]">사건 완료 평가</h2>
                  <p className="text-sm text-slate-500">협업 경험을 기반으로 민간조사원을 평가하면 다른 의뢰자의 선택에 도움이 됩니다.</p>
                </div>
                {hasReview && review ? (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={`review-static-${idx}`}
                          className={`h-4 w-4 ${review.rating >= idx + 1 ? "fill-current" : "fill-transparent"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-[#1a2340]">{review.rating} / 5</span>
                  </div>
                ) : null}
              </div>

              {hasReview && review && !isEditingReview ? (
                <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={`review-detail-${idx}`}
                          className={`h-5 w-5 ${review.rating >= idx + 1 ? "fill-current" : "fill-transparent"}`}
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-400">마지막 수정 {new Date(review.updatedAt).toLocaleString("ko-KR")}</span>
                  </div>
                  {review.comment ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{review.comment}</p>
                  ) : (
                    <p className="text-sm text-slate-400">남겨진 코멘트가 없습니다.</p>
                  )}
                  {canManageReview ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingReview(true);
                        setReviewState({
                          rating: review.rating,
                          comment: review.comment ?? "",
                        });
                      }}
                      className="inline-flex w-full items-center justify-center rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      평가 수정하기 ↗
                    </button>
                  ) : null}
                </div>
              ) : null}

              {canManageReview && (isEditingReview || !hasReview) ? (
                <div className="mt-6 space-y-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-400">평점 선택</span>
                    <div className="flex flex-wrap items-center gap-3">
                      {Array.from({ length: 5 }).map((_, idx) => {
                        const value = idx + 1;
                        const active = reviewState.rating >= value;
                        return (
                          <button
                            key={`review-input-${value}`}
                            type="button"
                            onClick={() => setReviewState((prev) => ({ ...prev, rating: value }))}
                            className={`rounded-full p-1 transition focus:outline-none focus:ring-2 focus:ring-amber-400 ${active ? "scale-105" : "hover:scale-105"}`}
                            aria-label={`${value}점 선택`}
                          >
                            <Star
                              className={`h-8 w-8 ${active ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                              strokeWidth={1.5}
                            />
                          </button>
                        );
                      })}
                      <span className="text-sm font-semibold text-[#1a2340]">
                        {reviewState.rating > 0 ? `${reviewState.rating}점` : "점수를 선택하세요"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="review-comment" className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-400">
                      코멘트 (선택)
                    </label>
                    <textarea
                      id="review-comment"
                      value={reviewState.comment}
                      onChange={(event) => setReviewState((prev) => ({ ...prev, comment: event.target.value }))}
                      maxLength={2000}
                      rows={4}
                      placeholder="민간조사원의 커뮤니케이션, 전문성, 결과물에 대해 기록해 주세요."
                      className="mt-2 w-full resize-y rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>최대 2,000자까지 입력할 수 있습니다.</span>
                      <span>{reviewState.comment.length} / 2000</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleReviewSubmit}
                      disabled={submittingReview || reviewState.rating < 1}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                    >
                      {submittingReview ? "저장 중..." : hasReview ? "평가 수정 저장" : "평가 등록하기"}
                    </button>
                    {hasReview ? (
                      <button
                        type="button"
                        onClick={handleCancelReviewEdit}
                        className="text-sm font-medium text-slate-500 transition hover:text-slate-700"
                      >
                        취소
                      </button>
                    ) : null}
                  </div>

                  <p className="text-xs text-slate-400">평점과 코멘트는 팀 내부 품질 평가에도 활용됩니다. 필요 시 관리자가 내용을 검수할 수 있습니다.</p>
                </div>
              ) : null}

              {!hasReview && !canManageReview ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
                  사건이 완료되고 의뢰자 본인으로 로그인하면 평가를 남길 수 있습니다.
                </div>
              ) : null}
            </section>

            {canViewInvestigatorPanels ? (
              <section className="rounded-3xl border border-slate-200 bg-white px-6 py-7 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-indigo-500">Investigator Briefing</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#1a2340]">AI 브리핑 허브</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      트렌드 경보, 실행 계획, 보고 초안, 협상 전략을 한곳에서 확인하세요.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {briefingIssues.general ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-600">
                        <FiAlertCircle className="h-3.5 w-3.5" />
                        {briefingIssues.general}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleRefreshBriefing}
                      className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
                    >
                      <FiRefreshCcw className={`${briefingLoading ? "animate-spin" : ""} h-3.5 w-3.5`} />
                      다시 불러오기
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                  <div className="space-y-6">
                    <AIInsightsPanel
                      insights={briefingInsights}
                      isLoading={briefingLoading}
                      error={briefingIssues.insights}
                      onRetry={handleRefreshBriefing}
                      showInvestigatorInsights
                      investigatorSlot={investigatorBriefingSlot}
                    />
                  </div>
                  <div className="space-y-6">
                    <ReportDraftPanel
                      report={briefingReport}
                      isLoading={briefingLoading}
                      error={briefingIssues.report}
                      onGenerate={handleRefreshBriefing}
                      showInvestigatorInsights
                    />
                    <NegotiationCoachPanel
                      plan={briefingPlan}
                      isLoading={briefingLoading}
                      error={briefingIssues.negotiation}
                      onRegenerate={handleRefreshBriefing}
                      showInvestigatorInsights
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {!canViewInvestigatorPanels && showInvestigatorNotice ? (
              <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-6 text-sm text-slate-500 shadow-sm">
                <div className="flex flex-col gap-2">
                  <h2 className="text-base font-semibold text-[#1a2340]">탐정 전용 브리핑</h2>
                  <p>
                    이 사건을 맡은 민간조사원 또는 관리자 계정으로 접속하면 AI 브리핑 허브에서 트렌드 경보, 다음 행동 제안,
                    체크리스트, 협상 코치를 확인할 수 있습니다.
                  </p>
                </div>
              </section>
            ) : null}

            <section className="rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#1a2340]">타임라인</h2>
              <div className="mt-6 space-y-4">
                {request.timeline.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
                    아직 기록된 타임라인 이벤트가 없습니다.
                  </p>
                ) : (
                  request.timeline.map((entry, index) => {
                    const meta = getTimelineMeta(entry.type);
                    const Icon = meta.icon;
                    const payloadText = extractTimelinePayloadText(entry.payload);

                    return (
                      <div key={entry.id} className="relative pl-12">
                        {index < request.timeline.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="absolute left-[1.375rem] top-8 block h-[calc(100%-2.25rem)] w-px bg-slate-200"
                          />
                        )}
                        <span className={`absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border ${meta.tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1a2340]">{meta.label}</p>
                              {meta.description && <p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>}
                            </div>
                            <span className="shrink-0 text-xs text-slate-400">{formatTime(entry.createdAt)}</span>
                          </div>
                          {entry.title && <p className="mt-2 text-sm font-medium text-slate-700">{entry.title}</p>}
                          {entry.note && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{entry.note}</p>}
                          {payloadText && (
                            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{payloadText}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-wide text-slate-400">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5">{entry.type.replace(/_/g, " ")}</span>
                            <span className="text-slate-300">•</span>
                            <span className="normal-case text-slate-500">
                              {entry.author ? entry.author.name ?? entry.author.email ?? "이름 미기재" : "시스템"}
                            </span>
                            {entry.author?.email && entry.author.name && (
                              <span className="normal-case text-slate-400">{entry.author.email}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
