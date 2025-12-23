"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CASE_STATUS_META, CaseStatusKey, TIMELINE_TYPE_LABEL } from "@/lib/investigationWorkflow";
import { useUserStore } from "@/lib/userStore";

type RequestRecord = {
  id: number;
  title: string;
  status: CaseStatusKey | string;
  createdAt: string;
  updatedAt: string;
  scenarioId?: number | null;
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
    role?: string;
  } | null;
  investigator?: {
    id: number;
    status: string;
    contactPhone?: string | null;
    serviceArea?: string | null;
    user?: {
      id: number;
      name: string;
      email: string;
    } | null;
  } | null;
  timeline?: Array<{
    id: number;
    type: string;
    title?: string | null;
    note?: string | null;
    createdAt: string;
  }>;
};

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const STATUS_FILTERS: Array<{ value: CaseStatusKey | "ALL"; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "MATCHING", label: "사건 요청" },
  { value: "ACCEPTED", label: "수락됨" },
  { value: "IN_PROGRESS", label: "진행 중" },
  { value: "REPORTING", label: "사건 보고" },
  { value: "COMPLETED", label: "완료" },
  { value: "DECLINED", label: "거절됨" },
  { value: "CANCELLED", label: "취소됨" },
];

export default function InvestigationRequestsPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CaseStatusKey | "ALL">("ALL");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [viewMode, setViewMode] = useState<"assigned" | "customer">("assigned");
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4200);
    }
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const loadRequests = useCallback(async (authToken: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const role = user?.role ?? null;
      const isInvestigator = role === "investigator";
      if (isInvestigator) {
        params.set("view", viewMode === "customer" ? "customer" : "assigned");
      }
      const res = await fetch(`/api/investigation-requests?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent("/investigation-requests")}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || "사건 의뢰 목록을 불러오지 못했습니다.";
        pushToast("error", message);
        return;
      }
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      const message = "사건 의뢰를 불러오던 중 오류가 발생했습니다.";
      pushToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [pushToast, router, statusFilter, user?.role, viewMode]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadRequests(token);
  }, [token, loadRequests]);

  const hasToken = Boolean(token);
  const role = user?.role ?? null;
  const isCustomer = role === "user" || role === "enterprise";
  const isInvestigator = role === "investigator";

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const request of requests) {
      const key = request.status || "UNKNOWN";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [requests]);

  const setRequestActionLoading = (id: number, value: boolean) => {
    setActionLoading((prev) => ({ ...prev, [id]: value }));
  };

  const handleStatusUpdate = async (
    requestId: number,
    nextStatus: CaseStatusKey,
    extra: Record<string, unknown> = {},
  ) => {
    if (!token) return;
    setRequestActionLoading(requestId, true);
    try {
      const res = await fetch(`/api/investigation-requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus, ...extra }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const message = data?.error || "상태를 업데이트하지 못했습니다.";
        pushToast("error", message);
        return;
      }
      pushToast("success", "사건 상태가 업데이트되었습니다.");
      await loadRequests(token);
    } catch (err) {
      console.error(err);
      pushToast("error", "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setRequestActionLoading(requestId, false);
    }
  };

  const handleAccept = (requestId: number) => {
    handleStatusUpdate(requestId, "ACCEPTED");
  };

  const handleDecline = (requestId: number) => {
    const reason = window.prompt("거절 사유를 입력해 주세요.");
    if (!reason) return;
    handleStatusUpdate(requestId, "DECLINED", { declineReason: reason });
  };

  const handleProgression = (requestId: number, nextStatus: CaseStatusKey, promptLabel?: string) => {
    if (promptLabel) {
      const note = window.prompt(promptLabel);
      if (note === null) return;
      handleStatusUpdate(requestId, nextStatus, { statusNote: note });
    } else {
      handleStatusUpdate(requestId, nextStatus);
    }
  };

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

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6">
        <header className="rounded-3xl bg-white px-6 py-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">
                {isInvestigator ? "Investigator Workspace" : "My Investigation Requests"}
              </p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">
                {isInvestigator ? "받은 사건 요청" : "나의 사건 의뢰"}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {isInvestigator
                  ? "의뢰인이 보낸 사건 요청을 확인하고, 빠르게 수락하거나 진행 상태를 업데이트하세요."
                  : "요청한 사건의 상태를 추적하고, 민간조사원과 협업을 이어가세요."}
              </p>
            </div>
            <div className="flex flex-col gap-3 text-xs text-slate-500">
              {isInvestigator && (
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "assigned" as const, label: "받은 사건" },
                      { value: "customer" as const, label: "내가 의뢰한 사건" },
                    ]
                  ).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setViewMode(option.value)}
                      className={`inline-flex items-center rounded-full border px-4 py-2 font-semibold transition ${
                        viewMode === option.value
                          ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {STATUS_FILTERS.map((filter) => {
                  const count =
                    filter.value === "ALL"
                      ? requests.length
                      : statusCounts[filter.value] ?? 0;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-medium transition ${
                        statusFilter === filter.value
                          ? "border-indigo-400 bg-indigo-50 text-indigo-600"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <span>{filter.label}</span>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {!hasToken && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-slate-500">
            <p className="text-sm">사건 의뢰 내역을 확인하려면 로그인해주세요.</p>
            <button
              onClick={() => router.push(`/login?redirect=${encodeURIComponent("/investigation-requests")}`)}
              className="mt-3 inline-flex items-center rounded-full bg-[#1f3aec] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#172ac7]"
            >
              로그인하러 가기
            </button>
          </section>
        )}

        {hasToken && isInvestigator && (
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center text-sm text-slate-500">
                {viewMode === "assigned"
                  ? "아직 의뢰인이 보낸 사건이 없습니다."
                  : "내가 의뢰한 사건이 없습니다."}
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const statusKey = (request.status as CaseStatusKey) ?? "MATCHING";
                  const statusMeta = CASE_STATUS_META[statusKey] ?? CASE_STATUS_META.MATCHING;
                  const latestTimeline = request.timeline?.[request.timeline.length - 1];
                  const loadingAction = Boolean(actionLoading[request.id]);
                  const customer = request.user;
                  const canAccept = statusKey === "MATCHING";
                  const canDecline = statusKey === "MATCHING";
                  const canStart = statusKey === "ACCEPTED";
                  const canReport = statusKey === "IN_PROGRESS";
                  const canComplete = statusKey === "REPORTING";

                  return (
                    <article
                      key={request.id}
                      className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                              {statusMeta.label}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              최신 업데이트 {new Date(request.updatedAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <h2 className="mt-3 text-xl font-semibold text-slate-900">{request.title}</h2>
                          {customer && (
                            <p className="mt-2 text-sm text-slate-600">
                              의뢰인: <span className="font-medium text-slate-800">{customer.name}</span>
                              <span className="ml-2 text-slate-400">{customer.email}</span>
                            </p>
                          )}
                          {latestTimeline && (
                            <p className="mt-2 text-sm text-slate-500">
                              {TIMELINE_TYPE_LABEL[latestTimeline.type]?.label ?? "업데이트"} · {new Date(latestTimeline.createdAt).toLocaleString("ko-KR")}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {canAccept && (
                              <button
                                onClick={() => handleAccept(request.id)}
                                disabled={loadingAction}
                                className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {loadingAction ? "처리 중..." : "수락하기"}
                              </button>
                            )}
                            {canDecline && (
                              <button
                                onClick={() => handleDecline(request.id)}
                                disabled={loadingAction}
                                className="inline-flex items-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                              >
                                거절하기
                              </button>
                            )}
                            {canStart && (
                              <button
                                onClick={() => handleProgression(request.id, "IN_PROGRESS", "진행 메모를 남기세요 (선택)" )}
                                disabled={loadingAction}
                                className="inline-flex items-center rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                              >
                                진행 시작
                              </button>
                            )}
                            {canReport && (
                              <button
                                onClick={() => handleProgression(request.id, "REPORTING", "보고 요약을 입력해주세요 (선택)" )}
                                disabled={loadingAction}
                                className="inline-flex items-center rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold text-sky-600 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                              >
                                보고 준비
                              </button>
                            )}
                            {canComplete && (
                              <button
                                onClick={() => handleProgression(request.id, "COMPLETED", "완료 메모를 입력해주세요 (선택)" )}
                                disabled={loadingAction}
                                className="inline-flex items-center rounded-full bg-[#1f3aec] px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#172ac7] disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                사건 완료
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/investigation-requests/${request.id}`}
                              className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              상세 보기 ↗
                            </Link>
                            {request.scenarioId && (
                              <Link
                                href={`/scenarios/${request.scenarioId}`}
                                className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                연관 시나리오
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {hasToken && !isCustomer && !isInvestigator && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-700">
            현재 계정 유형에서는 사건 의뢰 내역을 확인할 수 없습니다.
          </section>
        )}

        {hasToken && isCustomer && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center text-sm text-slate-500">
                아직 등록된 사건 의뢰가 없습니다. <Link href="/investigators" className="font-semibold text-indigo-600 hover:text-indigo-700">탐정 디렉터리</Link>에서 민간조사원을 선택해 사건을 의뢰해보세요.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => {
                  const statusKey = (request.status as CaseStatusKey) ?? "MATCHING";
                  const statusMeta = CASE_STATUS_META[statusKey] ?? CASE_STATUS_META.MATCHING;
                  const latestTimeline = request.timeline?.[request.timeline.length - 1];
                  return (
                    <article
                      key={request.id}
                      className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                              {statusMeta.label}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              생성 {new Date(request.createdAt).toLocaleString("ko-KR")}
                            </span>
                          </div>
                          <h2 className="mt-3 text-xl font-semibold text-slate-900">{request.title}</h2>
                          {latestTimeline && (
                            <p className="mt-2 text-sm text-slate-500">
                              {TIMELINE_TYPE_LABEL[latestTimeline.type]?.label ?? "업데이트"} · {new Date(latestTimeline.createdAt).toLocaleString("ko-KR")}
                            </p>
                          )}
                          {request.investigator?.user && (
                            <p className="mt-3 text-sm text-slate-600">
                              담당 민간조사원: <span className="font-medium text-slate-800">{request.investigator.user.name}</span>
                              <span className="ml-2 text-slate-400">{request.investigator.user.email}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <Link
                            href={`/investigation-requests/${request.id}`}
                            className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-100"
                          >
                            자세히 보기 ↗
                          </Link>
                          <Link
                            href={`/investigation-requests/new?investigatorId=${request.investigator?.id ?? ""}`}
                            className="inline-flex items-center text-xs font-medium text-slate-400 hover:text-slate-600"
                          >
                            비슷한 사건 다시 요청하기
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
