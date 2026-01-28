"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserStore } from "@/lib/userStore";
import { CASE_STATUS_META } from "@/lib/investigationWorkflow";
import type { IntakeSummary } from "@/app/simulation/types";

type InvestigatorSummary = {
  id: number;
  name: string;
  email: string;
  contactPhone: string | null;
  serviceArea: string | null;
  introduction: string | null;
  experienceYears: number | null;
  specialties: unknown;
};

type ScenarioOption = {
  id: number;
  title: string;
  category: string | null;
  difficulty: string | null;
};

type RequestComposerProps = {
  investigator: InvestigatorSummary;
  scenarios: ScenarioOption[];
};

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

type PrefillPayload = {
  investigatorId: number;
  createdAt: number;
  title?: string;
  details?: string;
  conversationSummary?: string;
  structuredSummary?: IntakeSummary | null;
  transcript?: Array<{ role: string; content: string }>;
  transcriptText?: string;
};

const toSpecialtyArray = (value: unknown): string[] => {
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

export default function RequestComposer({ investigator, scenarios }: RequestComposerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [prefillContext, setPrefillContext] = useState<
    Pick<PrefillPayload, "conversationSummary" | "structuredSummary" | "transcript" | "transcriptText"> | undefined
  >(undefined);

  const investigatorSpecialties = useMemo(() => toSpecialtyArray(investigator.specialties), [investigator.specialties]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rawPrefill = sessionStorage.getItem("investigationRequestPrefill");
    if (!rawPrefill) {
      return;
    }

    try {
      const parsed = JSON.parse(rawPrefill) as PrefillPayload;
      if (parsed.investigatorId !== investigator.id) {
        return;
      }

      setTitle((prev) => (prev ? prev : parsed.title ?? prev));
      setDetails((prev) => {
        if (prev) return prev;
        if (parsed.details) return parsed.details;
        if (typeof parsed.transcriptText === "string") return parsed.transcriptText;
        return prev;
      });
      setPrefillContext({
        conversationSummary: parsed.conversationSummary ?? undefined,
        structuredSummary: parsed.structuredSummary ?? undefined,
        transcript: Array.isArray(parsed.transcript) ? parsed.transcript : undefined,
        transcriptText: typeof parsed.transcriptText === "string" ? parsed.transcriptText : undefined,
      });
    } catch (prefillError) {
      console.warn("[REQUEST_COMPOSER_PREFILL_ERROR]", prefillError);
    } finally {
      sessionStorage.removeItem("investigationRequestPrefill");
    }
  }, [investigator.id]);

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

  const handleCopyTranscript = useCallback(() => {
    if (!prefillContext?.transcriptText) return;
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      pushToast("error", "클립보드에 복사할 수 없습니다. 브라우저를 확인해주세요.");
      return;
    }
    navigator.clipboard
      .writeText(prefillContext.transcriptText)
      .then(() => pushToast("info", "대화 기록을 클립보드에 복사했습니다."))
      .catch(() => pushToast("error", "대화 기록 복사에 실패했습니다."));
  }, [prefillContext?.transcriptText]);

  const handleRedirectToLogin = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (!params.has("investigatorId")) {
      params.set("investigatorId", String(investigator.id));
    }
    const redirectTarget = `/investigation-requests/new?${params.toString()}`;
    router.push(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  };

  const isCustomer = user?.role === "user" || user?.role === "enterprise";
  const isInvestigator = user?.role === "investigator";

  const handleSubmit = async () => {
    if (!token) {
      handleRedirectToLogin();
      return;
    }
    if (isInvestigator) {
      pushToast("error", "민간조사원 계정에서는 사건 의뢰를 생성할 수 없습니다.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDetails = details.trim();

    if (trimmedTitle.length < 2 || trimmedDetails.length < 5) {
      pushToast("error", "사건 제목과 세부 내용을 충분히 입력해주세요.");
      return;
    }

    const budgetMinValue = budgetMin ? Number(budgetMin) : null;
    const budgetMaxValue = budgetMax ? Number(budgetMax) : null;

    if ((budgetMinValue ?? 0) < 0 || (budgetMaxValue ?? 0) < 0) {
      pushToast("error", "예산은 0 이상의 숫자로 입력해주세요.");
      return;
    }

    if (budgetMinValue != null && budgetMaxValue != null && budgetMinValue > budgetMaxValue) {
      pushToast("error", "예산 최소 금액이 최대 금액보다 큽니다.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: trimmedTitle,
        details: trimmedDetails,
        investigatorId: investigator.id,
      };

      if (scenarioId) {
        payload.scenarioId = Number(scenarioId);
      }
      if (budgetMinValue != null) {
        payload.budgetMin = budgetMinValue;
      }
      if (budgetMaxValue != null) {
        payload.budgetMax = budgetMaxValue;
      }

      const res = await fetch("/api/investigation-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = typeof data?.error === "string" ? data.error : "사건 의뢰에 실패했습니다.";
        setError(message);
        pushToast("error", message);
        return;
      }

      pushToast("success", "사건 의뢰가 등록되었습니다.");
      router.push(`/investigation-requests/${data.id}`);
    } catch (err) {
      console.error(err);
      const message = "사건 의뢰 중 오류가 발생했습니다.";
      setError(message);
      pushToast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-white to-[#f8fafc] pb-16 pt-10">
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

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6">
        <header className="rounded-3xl bg-white/90 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Investigation Request</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">사건 의뢰 작성</h1>
              <p className="mt-2 text-sm text-slate-500">
                선택한 민간조사원에게 사건을 맡기기 위한 요청서를 작성합니다. 사건의 범위, 목표, 예산을 명확하게 전달하면 더 빠른 대응을 받을 수 있어요.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">진행 단계</p>
              <ul className="mt-2 space-y-1">
                {Object.entries(CASE_STATUS_META).map(([status, meta]) => (
                  <li key={status} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span>{meta.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold text-[#1a2340]">선택한 민간조사원</h2>
          <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xl font-semibold text-slate-900">{investigator.name}</p>
              <p className="text-sm text-slate-500">{investigator.email}</p>
              {investigator.contactPhone && (
                <p className="mt-2 text-sm text-slate-500">☎ {investigator.contactPhone}</p>
              )}
              {investigator.serviceArea && (
                <p className="mt-2 text-sm text-slate-500">주요 활동 지역: {investigator.serviceArea}</p>
              )}
              {typeof investigator.experienceYears === "number" && (
                <p className="mt-2 text-sm text-slate-500">현장 경력: {investigator.experienceYears}년</p>
              )}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-700">전문 분야</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {investigatorSpecialties.length > 0 ? (
                  investigatorSpecialties.map((item, idx) => (
                    <span
                      key={`${investigator.id}-specialty-${idx}`}
                      className="inline-flex items-center rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">등록된 전문 분야가 없습니다.</span>
                )}
              </div>
            </div>
          </div>
          {investigator.introduction && (
            <p className="mt-4 rounded-2xl bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-600">
              {investigator.introduction}
            </p>
          )}
        </section>

        {!token && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-slate-500">
            <p className="text-sm">사건 의뢰를 작성하려면 로그인이 필요합니다.</p>
            <button
              onClick={handleRedirectToLogin}
              className="mt-3 inline-flex items-center rounded-full bg-[#1f3aec] px-6 py-2 text-sm font-semibold text-white shadow hover:bg-[#172ac7]"
            >
              로그인하러 가기
            </button>
          </section>
        )}

        {token && !isCustomer && !isInvestigator && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-700">
            현재 계정 유형에서는 사건 의뢰 기능을 사용할 수 없습니다. 고객 계정으로 로그인해주세요.
          </section>
        )}

        {token && isInvestigator && (
          <section className="rounded-3xl border border-rose-200 bg-rose-50/90 p-5 text-sm text-rose-700">
            민간조사원 계정에서는 사건 의뢰를 생성할 수 없습니다. 고객 계정으로 접속해주세요.
          </section>
        )}

        {token && isCustomer && (
          <>
            <section className="space-y-6">
              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-[#1a2340]">사건 개요</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">사건 제목 *</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="예: 제품 유출 의혹 조사"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">연관 시나리오</label>
                    <select
                      value={scenarioId}
                      onChange={(e) => setScenarioId(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">선택 없음</option>
                      {scenarios.map((scenario) => (
                        <option key={scenario.id} value={scenario.id}>
                          {scenario.title}
                          {scenario.category ? ` · ${scenario.category}` : ""}
                          {scenario.difficulty ? ` (${scenario.difficulty})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">사건 상세 *</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    className="min-h-[180px] rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="사건의 배경, 주요 사실, 필요한 지원 사항 등을 상세히 작성해주세요."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                <h2 className="text-lg font-semibold text-[#1a2340]">예산 & 일정</h2>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">예산 최소 (₩)</label>
                    <input
                      type="number"
                      min={0}
                      value={budgetMin}
                      onChange={(e) => setBudgetMin(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="예: 2000000"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">예산 최대 (₩)</label>
                    <input
                      type="number"
                      min={0}
                      value={budgetMax}
                      onChange={(e) => setBudgetMax(e.target.value)}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      placeholder="예: 5000000"
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  * 예산은 대략적인 범위로 작성해주셔도 좋습니다. 세부 조건은 민간조사원과 협의하세요.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href="/investigators"
                  className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  ← 다른 민간조사원 보기
                </Link>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center rounded-full bg-[#1f3aec] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#172ac7] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {submitting ? "등록 중..." : "사건 의뢰 보내기"}
                </button>
              </div>
            </section>

            {prefillContext && (prefillContext.conversationSummary || prefillContext.transcript?.length) ? (
              <section className="rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1a2340]">AI Intake 대화 기록</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      시뮬레이션에서 수집된 요약과 대화 내역입니다. 필요에 따라 세부 내용을 수정하거나 추가하세요.
                    </p>
                  </div>
                  {prefillContext.transcriptText ? (
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="inline-flex items-center rounded-full border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                    >
                      대화 기록 복사
                    </button>
                  ) : null}
                </div>

                {prefillContext.conversationSummary ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">요약 브리핑</p>
                    <p className="mt-2 whitespace-pre-wrap">{prefillContext.conversationSummary}</p>
                  </div>
                ) : null}

                {prefillContext.transcript?.length ? (
                  <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white/95">
                    <ul className="divide-y divide-slate-100">
                      {prefillContext.transcript.map((entry, index) => (
                        <li key={`transcript-${index}`} className="flex gap-3 px-4 py-3 text-sm">
                          <span
                            className={`mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              entry.role === "assistant"
                                ? "bg-indigo-500/10 text-indigo-600"
                                : "bg-slate-500/10 text-slate-600"
                            }`}
                          >
                            {entry.role === "assistant" ? "AI" : "의뢰인"}
                          </span>
                          <p className="flex-1 whitespace-pre-wrap text-slate-700">{entry.content}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
