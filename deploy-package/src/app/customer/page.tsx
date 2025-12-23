"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CASE_STATUS_META, CaseStatusKey } from "@/lib/investigationWorkflow";
import { useUserStore } from "@/lib/userStore";
import type {
  CustomerMeResponse,
  CustomerProfileDetail,
  InvestigationRequestSummary,
} from "@/types/investigation";

interface ToastMessage {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}

const statusKeyFromString = (value: string): CaseStatusKey => {
  return (Object.hasOwn(CASE_STATUS_META, value) ? value : "MATCHING") as CaseStatusKey;
};

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "-";
  return `${value.toLocaleString("ko-KR") } ₩`;
};

const joinPreferredCaseTypes = (value: string[] | undefined) => {
  if (!Array.isArray(value) || value.length === 0) return "";
  return value.join(", ");
};

interface ProfileFormState {
  name: string;
  displayName: string;
  phone: string;
  region: string;
  occupation: string;
  preferredCaseTypes: string;
  urgencyLevel: string;
  budgetMin: string;
  budgetMax: string;
  marketingOptIn: boolean;
}

const emptyProfileForm: ProfileFormState = {
  name: "",
  displayName: "",
  phone: "",
  region: "",
  occupation: "",
  preferredCaseTypes: "",
  urgencyLevel: "",
  budgetMin: "",
  budgetMax: "",
  marketingOptIn: false,
};

const CustomerDashboardPage = () => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const token = useUserStore((state) => state.token);

  const [profile, setProfile] = useState<CustomerProfileDetail | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [cases, setCases] = useState<InvestigationRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const pushToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4200);
    }
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const guardCustomer = useCallback(() => {
    if (!user) return false;
    if (user.role !== "user" && user.role !== "enterprise") {
      pushToast("error", "고객 전용 페이지입니다.");
      router.push("/");
      return false;
    }
    return true;
  }, [router, user, pushToast]);

  const loadDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [profileRes, casesRes] = await Promise.all([
        fetch("/api/me/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("/api/investigation-requests?view=customer", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (profileRes.status === 401 || casesRes.status === 401) {
        router.push("/login?redirect=/customer");
        return;
      }

      if (!profileRes.ok) {
        const data = await profileRes.json().catch(() => ({ error: "프로필을 불러오지 못했습니다." }));
        pushToast("error", data?.error ?? "프로필을 불러오지 못했습니다.");
        setLoading(false);
        return;
      }

      const profilePayload = (await profileRes.json()) as CustomerMeResponse;
      if (profilePayload.role !== "USER" && profilePayload.role !== "ENTERPRISE") {
        pushToast("error", "고객 전용 페이지입니다.");
        router.push("/");
        return;
      }

      const casesPayload = (await casesRes.json().catch(() => [])) as InvestigationRequestSummary[];

      const profileDetail = profilePayload.profile ?? null;
      setProfile(profileDetail);
      setCases(Array.isArray(casesPayload) ? casesPayload : []);

      if (profileDetail) {
        setProfileForm({
          name: profilePayload.user.name ?? "",
          displayName: profileDetail.displayName ?? "",
          phone: profileDetail.phone ?? "",
          region: profileDetail.region ?? "",
          occupation: profileDetail.occupation ?? "",
          preferredCaseTypes: joinPreferredCaseTypes(profileDetail.preferredCaseTypes),
          urgencyLevel: profileDetail.urgencyLevel ?? "",
          budgetMin: profileDetail.budgetMin != null ? String(profileDetail.budgetMin) : "",
          budgetMax: profileDetail.budgetMax != null ? String(profileDetail.budgetMax) : "",
          marketingOptIn: Boolean(profileDetail.marketingOptIn),
        });
      } else {
        setProfileForm({
          ...emptyProfileForm,
          name: profilePayload.user.name ?? "",
        });
      }
    } catch (error) {
      console.error(error);
      pushToast("error", "대시보드를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [token, router, pushToast]);

  useEffect(() => {
    if (!token) {
      router.push("/login?redirect=/customer");
      return;
    }
    if (!guardCustomer()) {
      return;
    }
    void loadDashboard();
  }, [token, guardCustomer, loadDashboard, router]);

  const categorizedCases = useMemo(() => {
    const upcoming: InvestigationRequestSummary[] = [];
    const active: InvestigationRequestSummary[] = [];
    const completed: InvestigationRequestSummary[] = [];

    for (const item of cases) {
      const key = statusKeyFromString(item.status);
      if (key === "MATCHING") {
        upcoming.push(item);
      } else if (key === "COMPLETED" || key === "CANCELLED" || key === "DECLINED") {
        completed.push(item);
      } else {
        active.push(item);
      }
    }

    return { upcoming, active, completed };
  }, [cases]);

  const handleProfileInput = (field: keyof ProfileFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target as HTMLInputElement;
    const { type, checked, value } = target;
    if (type === "checkbox") {
      setProfileForm((prev) => ({ ...prev, [field]: checked }));
    } else {
      setProfileForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleProfileSave = async () => {
    if (!token) return;
    setSavingProfile(true);
    try {
      const preferredCaseTypes = profileForm.preferredCaseTypes
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      const payload: Record<string, unknown> = {
        name: profileForm.name.trim() || undefined,
        displayName: profileForm.displayName.trim() || null,
        phone: profileForm.phone.trim() || null,
        region: profileForm.region.trim() || null,
        occupation: profileForm.occupation.trim() || null,
        preferredCaseTypes,
        urgencyLevel: profileForm.urgencyLevel.trim() || null,
        marketingOptIn: profileForm.marketingOptIn,
      };

      const minValue = profileForm.budgetMin.trim();
      if (minValue) {
        const parsed = Number(minValue);
        if (Number.isNaN(parsed) || parsed < 0) {
          pushToast("error", "최소 예산은 0 이상의 숫자로 입력해주세요.");
          setSavingProfile(false);
          return;
        }
        payload.budgetMin = parsed;
      } else {
        payload.budgetMin = null;
      }

      const maxValue = profileForm.budgetMax.trim();
      if (maxValue) {
        const parsed = Number(maxValue);
        if (Number.isNaN(parsed) || parsed < 0) {
          pushToast("error", "최대 예산은 0 이상의 숫자로 입력해주세요.");
          setSavingProfile(false);
          return;
        }
        payload.budgetMax = parsed;
      } else {
        payload.budgetMax = null;
      }

      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "프로필 저장에 실패했습니다." }));
        pushToast("error", data?.error ?? "프로필 저장에 실패했습니다.");
        setSavingProfile(false);
        return;
      }

      pushToast("success", "프로필이 업데이트되었습니다.");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      pushToast("error", "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const renderCaseCard = (request: InvestigationRequestSummary) => {
    const statusKey = statusKeyFromString(request.status);
    const statusMeta = CASE_STATUS_META[statusKey];

    return (
      <article
        key={request.id}
        className="lira-card lira-card--padded transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
      >
        <div className="flex flex-col gap-4 md:flex-row md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.badge}`}>
                {statusMeta.label}
              </span>
              <span className="text-[11px] text-slate-400">업데이트 {formatDateTime(request.updatedAt)}</span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-900">{request.title}</h3>
            <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap line-clamp-3">{request.details}</p>
            {request.desiredOutcome && (
              <p className="mt-3 text-xs text-slate-500">
                목표: <span className="font-medium text-slate-700">{request.desiredOutcome}</span>
              </p>
            )}
            {request.investigator?.user && (
              <p className="mt-3 text-xs text-slate-500">
                담당 조사원: <span className="font-semibold text-slate-700">{request.investigator.user.name}</span> ({request.investigator.user.email})
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-3 text-xs text-slate-500">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="font-semibold text-slate-500">예산 범위</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatCurrency(request.budgetMin)} ~ {formatCurrency(request.budgetMax)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/investigation-requests/${request.id}`}
                className="lira-button lira-button--secondary text-xs"
              >
                상세 보기 ↗
              </Link>
              <Link
                href={`/investigation-requests/${request.id}/chat`}
                className="lira-button lira-button--accent text-xs"
              >
                채팅 이동
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
            <p className="text-xs font-semibold text-slate-500">타임라인</p>
            {request.timeline.length === 0 ? (
              <p className="mt-2 text-xs text-slate-400">아직 기록이 없습니다.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-xs">
                {[...request.timeline]
                  .slice(-3)
                  .reverse()
                  .map((entry) => (
                    <li key={entry.id}>
                      <span className="font-semibold">{entry.type}</span> · {formatDateTime(entry.createdAt)}
                      {entry.note && <span className="block text-slate-500">{entry.note}</span>}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
            <p className="text-xs font-semibold text-slate-500">연관 시나리오</p>
            {request.scenario ? (
              <div className="mt-2">
                <p className="text-sm font-semibold text-slate-800">{request.scenario.title}</p>
                <p className="text-xs text-slate-400">
                  {request.scenario.category ?? "카테고리 없음"} · {request.scenario.difficulty ?? "난이도 정보 없음"}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400">연결된 시나리오가 없습니다.</p>
            )}
          </div>
        </div>
      </article>
    );
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
                <span className="mt-0.5 text-base">
                  {toast.type === "success" ? "✓" : toast.type === "error" ? "⚠" : "ℹ"}
                </span>
                <div className="flex-1 leading-relaxed">{toast.message}</div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="pointer-events-auto text-xs text-slate-400 transition hover:text-slate-600"
                >
                  닫기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lira-container flex flex-col gap-8">
        <header className="lira-section">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Customer Workspace</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">내 사건 관리 허브</h1>
              <p className="mt-2 text-sm text-slate-500">
                프로필을 최신 상태로 유지하고, 의뢰한 사건의 진행 상황을 한눈에 확인하세요.
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-700">
              <p className="font-semibold">헬프 센터</p>
              <p className="mt-1 text-sm font-bold">support@lira.ai</p>
              <p className="mt-2 text-xs text-sky-600/70">긴급한 문의는 채팅 또는 이메일로 도와드릴게요.</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-[2fr_1.2fr]">
          <article className="lira-section">
            <h2 className="lira-section-title">프로필 정보</h2>
            {loading && !profile ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleProfileSave();
                }}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    이름
                    <input
                      value={profileForm.name}
                      onChange={handleProfileInput("name")}
                      className="lira-input"
                      placeholder="홍길동"
                    />
                  </label>
                  <label className="lira-field">
                    표시 이름
                    <input
                      value={profileForm.displayName}
                      onChange={handleProfileInput("displayName")}
                      className="lira-input"
                      placeholder="프로필에 노출될 이름"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    연락처
                    <input
                      value={profileForm.phone}
                      onChange={handleProfileInput("phone")}
                      className="lira-input"
                      placeholder="010-0000-0000"
                    />
                  </label>
                  <label className="lira-field">
                    활동 지역
                    <input
                      value={profileForm.region}
                      onChange={handleProfileInput("region")}
                      className="lira-input"
                      placeholder="서울 · 경기"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    직업
                    <input
                      value={profileForm.occupation}
                      onChange={handleProfileInput("occupation")}
                      className="lira-input"
                      placeholder="직업을 입력하세요"
                    />
                  </label>
                  <label className="lira-field">
                    긴급도
                    <input
                      value={profileForm.urgencyLevel}
                      onChange={handleProfileInput("urgencyLevel")}
                      className="lira-input"
                      placeholder="높음 / 보통 / 낮음"
                    />
                  </label>
                </div>
                <label className="lira-field">
                  선호 사건 유형 (쉼표로 구분)
                  <input
                    value={profileForm.preferredCaseTypes}
                    onChange={handleProfileInput("preferredCaseTypes")}
                    className="lira-input"
                    placeholder="배우자조사, 기업조사"
                  />
                </label>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="lira-field">
                    최소 예산 (₩)
                    <input
                      value={profileForm.budgetMin}
                      onChange={handleProfileInput("budgetMin")}
                      className="lira-input"
                      placeholder="1000000"
                    />
                  </label>
                  <label className="lira-field">
                    최대 예산 (₩)
                    <input
                      value={profileForm.budgetMax}
                      onChange={handleProfileInput("budgetMax")}
                      className="lira-input"
                      placeholder="5000000"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={profileForm.marketingOptIn}
                    onChange={handleProfileInput("marketingOptIn")}
                    className="lira-checkbox"
                  />
                  LIRA에서 제공하는 소식과 혜택을 이메일로 받겠습니다.
                </label>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="lira-button lira-button--primary"
                  >
                    {savingProfile ? "저장 중..." : "프로필 저장"}
                  </button>
                </div>
              </form>
            )}
          </article>

          <aside className="lira-section">
            <h2 className="lira-section-title">계정 요약</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="lira-stat">
                <dt className="font-semibold text-slate-500">가입일</dt>
                <dd>{formatDateTime(profile?.createdAt ?? null)}</dd>
              </div>
              <div className="lira-stat">
                <dt className="font-semibold text-slate-500">최근 수정</dt>
                <dd>{formatDateTime(profile?.updatedAt ?? null)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50/80 px-3 py-3">
                <dt className="text-sm font-semibold text-slate-500">선호 예산</dt>
                <dd className="mt-2 text-sm font-semibold text-slate-800">
                  {formatCurrency(profile?.budgetMin ?? null)} ~ {formatCurrency(profile?.budgetMax ?? null)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50/80 px-3 py-3">
                <dt className="text-sm font-semibold text-slate-500">선호 유형</dt>
                <dd className="mt-2 flex flex-wrap gap-2">
                  {profile?.preferredCaseTypes && profile.preferredCaseTypes.length > 0 ? (
                    profile.preferredCaseTypes.map((item, index) => (
                      <span key={`${item}-${index}`} className="lira-pill-muted">
                        {item}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">등록된 선호 유형이 없습니다.</span>
                  )}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="space-y-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-xl font-bold text-[#1a2340]">사건 현황</h2>
            <p className="text-sm text-slate-500">
              {cases.length === 0
                ? "아직 의뢰한 사건이 없습니다."
                : `총 ${cases.length}건의 사건을 관리 중입니다.`}
            </p>
          </header>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-3xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {categorizedCases.upcoming.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">확인 대기</h3>
                  <div className="space-y-4">
                    {categorizedCases.upcoming.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {categorizedCases.active.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">진행 중</h3>
                  <div className="space-y-4">
                    {categorizedCases.active.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {categorizedCases.completed.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700">종료된 사건</h3>
                  <div className="space-y-4">
                    {categorizedCases.completed.map((request) => renderCaseCard(request))}
                  </div>
                </div>
              )}

              {cases.length === 0 && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
                  새 사건을 의뢰하고 진척 상황을 여기에서 확인하세요.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default CustomerDashboardPage;
