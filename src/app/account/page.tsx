"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CASE_TYPE_OPTIONS, INVESTIGATOR_SPECIALTIES } from "@/lib/options";
import { useUserStore, UserRole } from "@/lib/userStore";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border border-rose-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "승인 거절",
};

const GENDER_OPTIONS = [
  { value: "", label: "선택 없음" },
  { value: "FEMALE", label: "여성" },
  { value: "MALE", label: "남성" },
  { value: "NON_BINARY", label: "논바이너리/기타" },
  { value: "NO_DISCLOSE", label: "응답하지 않음" },
];

type InvestigatorStatus = "PENDING" | "APPROVED" | "REJECTED" | null;

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type CustomerFormState = {
  displayName: string;
  phone: string;
  birthDate: string;
  gender: string;
  occupation: string;
  region: string;
  preferredCaseTypes: string[];
  budgetMin: string;
  budgetMax: string;
  urgencyLevel: string;
  marketingOptIn: boolean;
  name: string;
};

type InvestigatorFormState = {
  contactPhone: string;
  serviceArea: string;
  introduction: string;
  portfolioUrl: string;
  experienceYears: string;
  specialties: string[];
};

const DEFAULT_CUSTOMER_FORM: CustomerFormState = {
  displayName: "",
  phone: "",
  birthDate: "",
  gender: "",
  occupation: "",
  region: "",
  preferredCaseTypes: [],
  budgetMin: "",
  budgetMax: "",
  urgencyLevel: "",
  marketingOptIn: false,
  name: "",
};

const DEFAULT_INVESTIGATOR_FORM: InvestigatorFormState = {
  contactPhone: "",
  serviceArea: "",
  introduction: "",
  portfolioUrl: "",
  experienceYears: "",
  specialties: [],
};

export default function AccountPage() {
  const router = useRouter();
  const storeUser = useUserStore((state) => state.user);
  const storeToken = useUserStore((state) => state.token);
  const setUser = useUserStore((state) => state.setUser);
  const storeUserRef = useRef(storeUser);
  const setUserRef = useRef(setUser);
  const routerRef = useRef(router);

  const [authToken, setAuthToken] = useState<string | null>(storeToken ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(storeUser?.role ?? null);
  const [investigatorStatus, setInvestigatorStatus] = useState<InvestigatorStatus>(
    storeUser?.investigatorStatus ?? null,
  );
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(DEFAULT_CUSTOMER_FORM);
  const [investigatorForm, setInvestigatorForm] = useState<InvestigatorFormState>(
    DEFAULT_INVESTIGATOR_FORM,
  );
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingInvestigator, setSavingInvestigator] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 4200);
    }
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const tokenToUse = useMemo(() => {
    if (authToken) return authToken;
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("lira.authToken");
    }
    return null;
  }, [authToken]);

  useEffect(() => {
    storeUserRef.current = storeUser;
  }, [storeUser]);

  useEffect(() => {
    setUserRef.current = setUser;
  }, [setUser]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const loadProfile = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      clearToasts();
      try {
        const res = await fetch("/api/me/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          routerRef.current?.push(`/login?redirect=${encodeURIComponent("/account")}`);
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          const message = data.error || "정보를 불러오지 못했습니다.";
          setError(message);
          pushToast("error", message);
          return;
        }
        const normalizedRole = (data.role?.toLowerCase?.() as UserRole | undefined) ?? "user";
        setRole(normalizedRole);
        if (normalizedRole === "user") {
          setCustomerForm({
            displayName: data.profile?.displayName ?? "",
            phone: data.profile?.phone ?? "",
            birthDate: data.profile?.birthDate ? data.profile.birthDate.slice(0, 10) : "",
            gender: data.profile?.gender ?? "",
            occupation: data.profile?.occupation ?? "",
            region: data.profile?.region ?? "",
            preferredCaseTypes: Array.isArray(data.profile?.preferredCaseTypes)
              ? data.profile.preferredCaseTypes
              : [],
            budgetMin:
              typeof data.profile?.budgetMin === "number"
                ? String(data.profile.budgetMin)
                : "",
            budgetMax:
              typeof data.profile?.budgetMax === "number"
                ? String(data.profile.budgetMax)
                : "",
            urgencyLevel: data.profile?.urgencyLevel ?? "",
            marketingOptIn: Boolean(data.profile?.marketingOptIn),
            name: data.user?.name ?? "",
          });
        } else if (normalizedRole === "investigator") {
          setInvestigatorForm({
            contactPhone: data.profile?.contactPhone ?? "",
            serviceArea: data.profile?.serviceArea ?? "",
            introduction: data.profile?.introduction ?? "",
            portfolioUrl: data.profile?.portfolioUrl ?? "",
            experienceYears:
              typeof data.profile?.experienceYears === "number"
                ? String(data.profile.experienceYears)
                : "",
            specialties: Array.isArray(data.profile?.specialties) ? data.profile.specialties : [],
          });
        }
        const fallbackUser = storeUserRef.current;
        setInvestigatorStatus(data.investigatorStatus ?? fallbackUser?.investigatorStatus ?? null);
        const normalizedUserRole = normalizedRole;
        setUserRef.current?.(
          {
            id: String(data.user?.id ?? fallbackUser?.id ?? ""),
            email: data.user?.email ?? fallbackUser?.email ?? "",
            name: data.user?.name ?? fallbackUser?.name ?? "",
            role: normalizedUserRole,
            monthlyUsage: fallbackUser?.monthlyUsage,
            remainingTokens: fallbackUser?.remainingTokens,
            investigatorStatus: data.investigatorStatus ?? fallbackUser?.investigatorStatus,
          },
          token,
        );
        setSuccessMessage(null);
        clearToasts();
      } catch (err) {
        console.error(err);
        const message = "정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setError(message);
        pushToast("error", message);
      } finally {
        setLoading(false);
      }
    },
    [clearToasts, pushToast],
  );

  useEffect(() => {
    if (!tokenToUse) {
      if (typeof window !== "undefined") {
        const stored = sessionStorage.getItem("lira.authToken");
        if (stored) {
          setAuthToken(stored);
        } else {
          routerRef.current?.push(`/login?redirect=${encodeURIComponent("/account")}`);
        }
      }
      return;
    }
    loadProfile(tokenToUse);
  }, [tokenToUse, loadProfile]);

  const toggleValue = (list: string[], value: string) =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const handleCustomerChange = <K extends keyof CustomerFormState>(key: K, value: CustomerFormState[K]) => {
    setCustomerForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleInvestigatorChange = <K extends keyof InvestigatorFormState>(
    key: K,
    value: InvestigatorFormState[K],
  ) => {
    setInvestigatorForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCustomerSave = async () => {
    if (!tokenToUse) return;
    setSavingCustomer(true);
    setError(null);
    setSuccessMessage(null);
    clearToasts();

    const trimmedName = customerForm.name.trim();
    const trimmedPhone = customerForm.phone.trim();
    if (!trimmedName) {
      const message = "이름을 입력해주세요.";
      setError(message);
      pushToast("error", message);
      setSavingCustomer(false);
      return;
    }
    if (!trimmedPhone) {
      const message = "연락 가능한 휴대폰 번호를 입력해주세요.";
      setError(message);
      pushToast("error", message);
      setSavingCustomer(false);
      return;
    }

    const budgetMinValue = customerForm.budgetMin ? Number(customerForm.budgetMin) : null;
    const budgetMaxValue = customerForm.budgetMax ? Number(customerForm.budgetMax) : null;
    if ((budgetMinValue ?? 0) < 0 || (budgetMaxValue ?? 0) < 0) {
      const message = "예산은 0 이상의 값으로 입력해주세요.";
      setError(message);
      pushToast("error", message);
      setSavingCustomer(false);
      return;
    }
    if (budgetMinValue != null && budgetMaxValue != null && budgetMinValue > budgetMaxValue) {
      const message = "예산 최소 금액이 최대 금액보다 클 수 없습니다.";
      setError(message);
      pushToast("error", message);
      setSavingCustomer(false);
      return;
    }

    const effectiveDisplayName = customerForm.displayName.trim() || trimmedName;
    try {
      const payload: Record<string, unknown> = {
        displayName: effectiveDisplayName,
        phone: trimmedPhone,
        gender: customerForm.gender,
        occupation: customerForm.occupation,
        region: customerForm.region,
        preferredCaseTypes: customerForm.preferredCaseTypes,
        urgencyLevel: customerForm.urgencyLevel || null,
        marketingOptIn: customerForm.marketingOptIn,
        name: trimmedName,
      };
      if (customerForm.birthDate) {
  payload.birthDate = customerForm.birthDate;
      }
      payload.budgetMin = budgetMinValue;
      payload.budgetMax = budgetMaxValue;

      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || "프로필 저장에 실패했습니다.";
        setError(message);
        pushToast("error", message);
        return;
      }
      const message = "고객 프로필이 업데이트되었습니다.";
      setSuccessMessage(message);
      pushToast("success", message);
      if (customerForm.displayName.trim() === "") {
        setCustomerForm((prev) => ({ ...prev, displayName: effectiveDisplayName }));
      }
      if (trimmedName) {
        setUserRef.current?.(
          {
            id: storeUser?.id ?? "",
            email: storeUser?.email ?? "",
            name: trimmedName,
            role: role ?? storeUser?.role ?? 'user',
            monthlyUsage: storeUser?.monthlyUsage,
            remainingTokens: storeUser?.remainingTokens,
            investigatorStatus: storeUser?.investigatorStatus,
          },
          tokenToUse,
        );
      }
    } catch (err) {
      console.error(err);
      const message = "프로필 저장 중 오류가 발생했습니다.";
      setError(message);
      pushToast("error", message);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleInvestigatorSave = async () => {
    if (!tokenToUse) return;
    setSavingInvestigator(true);
    setError(null);
    setSuccessMessage(null);
    clearToasts();
    if (!investigatorForm.contactPhone.trim()) {
      const message = "연락 가능한 휴대폰 번호를 입력해주세요.";
      setError(message);
      pushToast("error", message);
      setSavingInvestigator(false);
      return;
    }
    if (investigatorForm.specialties.length === 0) {
      const message = "최소 한 개 이상의 전문 분야를 선택해 주세요.";
      setError(message);
      pushToast("error", message);
      setSavingInvestigator(false);
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        contactPhone: investigatorForm.contactPhone,
        serviceArea: investigatorForm.serviceArea,
        introduction: investigatorForm.introduction,
        portfolioUrl: investigatorForm.portfolioUrl,
        specialties: investigatorForm.specialties,
      };
      if (investigatorForm.experienceYears) {
        payload.experienceYears = Number(investigatorForm.experienceYears);
      }
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || "프로필 저장에 실패했습니다.";
        setError(message);
        pushToast("error", message);
        return;
      }
      const message = "민간조사원 프로필이 업데이트되었습니다.";
      setSuccessMessage(message);
      pushToast("success", message);
      if (data.investigatorStatus) {
        setInvestigatorStatus(data.investigatorStatus as InvestigatorStatus);
        setUserRef.current?.(
          {
            id: storeUser?.id ?? "",
            email: storeUser?.email ?? "",
            name: storeUser?.name ?? "",
            role: role ?? storeUser?.role ?? 'investigator',
            monthlyUsage: storeUser?.monthlyUsage,
            remainingTokens: storeUser?.remainingTokens,
            investigatorStatus: data.investigatorStatus,
          },
          tokenToUse,
        );
      }
    } catch (err) {
      console.error(err);
      const message = "프로필 저장 중 오류가 발생했습니다.";
      setError(message);
      pushToast("error", message);
    } finally {
      setSavingInvestigator(false);
    }
  };

  const headerTitle = role === "investigator" ? "민간조사원 정보 센터" : "나의 정보";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eef2ff] via-white to-[#f8fafc] py-12">
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center px-4">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-sm shadow-lg ring-1 ring-black/5 transition ${
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
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
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
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">My Workspace</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340]">{headerTitle}</h1>
              <p className="mt-2 text-sm text-slate-500">
                연락처, 선호도, 전문 분야 등 필요한 정보를 최신 상태로 유지하면 더 정확한 시뮬레이션과 매칭을 경험할 수 있습니다.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  {storeUser?.email}
                </span>
                {investigatorStatus && (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[investigatorStatus] || 'border border-slate-200 bg-slate-50 text-slate-600'}`}>
                    {STATUS_LABEL[investigatorStatus] ?? investigatorStatus}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-slate-500">
              <Link href="/simulation" className="inline-flex items-center rounded-full border border-slate-200 px-4 py-1.5 text-slate-600 transition hover:border-sky-300 hover:text-sky-600">
                ↗ 시뮬레이션 보러가기
              </Link>
              <Link href="/investigators" className="inline-flex items-center rounded-full border border-slate-200 px-4 py-1.5 text-slate-600 transition hover:border-sky-300 hover:text-sky-600">
                ↗ 탐정 디렉터리
              </Link>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-600">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-600">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-3xl border border-slate-100 bg-white/70 shadow-sm"
              />
            ))}
          </div>
        ) : (
          <>
            {role === "user" && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-semibold text-[#1a2340]">기본 정보</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">이름</label>
                      <input
                        value={customerForm.name}
                        onChange={(e) => handleCustomerChange('name', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="이름 (실명)"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">표시 이름</label>
                      <input
                        value={customerForm.displayName}
                        onChange={(e) => handleCustomerChange('displayName', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="서비스 내에서 노출되는 이름"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">휴대폰 번호</label>
                      <input
                        value={customerForm.phone}
                        onChange={(e) => handleCustomerChange('phone', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="연락 가능한 번호"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">거주 지역</label>
                      <input
                        value={customerForm.region}
                        onChange={(e) => handleCustomerChange('region', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="예: 서울 강남구"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">직업</label>
                      <input
                        value={customerForm.occupation}
                        onChange={(e) => handleCustomerChange('occupation', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="예: 마케팅 매니저"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">생년월일</label>
                      <input
                        type="date"
                        value={customerForm.birthDate}
                        onChange={(e) => handleCustomerChange('birthDate', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">성별</label>
                      <select
                        value={customerForm.gender}
                        onChange={(e) => handleCustomerChange('gender', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      >
                        {GENDER_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-semibold text-[#1a2340]">관심 사건 & 예산</h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-[#1a2340]">관심 사건 유형</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {CASE_TYPE_OPTIONS.map((option) => {
                          const checked = customerForm.preferredCaseTypes.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                                checked
                                  ? 'border-sky-400 bg-sky-50 text-sky-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  handleCustomerChange(
                                    'preferredCaseTypes',
                                    toggleValue(customerForm.preferredCaseTypes, option.value),
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <input
                        type="number"
                        min={0}
                        value={customerForm.budgetMin}
                        onChange={(e) => handleCustomerChange('budgetMin', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="예산 최소 (₩)"
                      />
                      <input
                        type="number"
                        min={0}
                        value={customerForm.budgetMax}
                        onChange={(e) => handleCustomerChange('budgetMax', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        placeholder="예산 최대 (₩)"
                      />
                    </div>

                    <select
                      value={customerForm.urgencyLevel}
                      onChange={(e) => handleCustomerChange('urgencyLevel', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="">긴급도 선택</option>
                      <option value="LOW">낮음 (2주 이상)</option>
                      <option value="MEDIUM">보통 (1~2주)</option>
                      <option value="HIGH">높음 (3~5일)</option>
                      <option value="CRITICAL">긴급 (48시간 이내)</option>
                    </select>

                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={customerForm.marketingOptIn}
                        onChange={(e) => handleCustomerChange('marketingOptIn', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                      />
                      <span>AI 리포트, 진행 알림 등 유용한 정보를 이메일로 받겠습니다.</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleCustomerSave}
                    disabled={savingCustomer}
                    className="inline-flex items-center rounded-full bg-[#1f3aec] px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#172ac7] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingCustomer ? '저장 중...' : '고객 정보 저장'}
                  </button>
                </div>
              </section>
            )}

            {role === "investigator" && (
              <section className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-semibold text-[#1a2340]">연락처 & 활동 정보</h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">연락 가능한 번호 *</label>
                      <input
                        value={investigatorForm.contactPhone}
                        onChange={(e) => handleInvestigatorChange('contactPhone', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder="010-1234-5678"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">주요 활동 지역</label>
                      <input
                        value={investigatorForm.serviceArea}
                        onChange={(e) => handleInvestigatorChange('serviceArea', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder="예: 수도권 전역"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">현장 경력 (년)</label>
                      <input
                        type="number"
                        min={0}
                        value={investigatorForm.experienceYears}
                        onChange={(e) => handleInvestigatorChange('experienceYears', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder="예: 7"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">포트폴리오 URL</label>
                      <input
                        value={investigatorForm.portfolioUrl}
                        onChange={(e) => handleInvestigatorChange('portfolioUrl', e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder="https://"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
                  <h2 className="text-lg font-semibold text-[#1a2340]">전문 분야 & 소개</h2>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-[#1a2340]">전문 분야 (최소 1개)</p>
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {INVESTIGATOR_SPECIALTIES.map((option) => {
                          const checked = investigatorForm.specialties.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm shadow-sm transition ${
                                checked
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  handleInvestigatorChange(
                                    'specialties',
                                    toggleValue(investigatorForm.specialties, option.value),
                                  )
                                }
                                className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-400"
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-slate-500">소개 문구</label>
                      <textarea
                        value={investigatorForm.introduction}
                        onChange={(e) => handleInvestigatorChange('introduction', e.target.value)}
                        className="min-h-[140px] rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                        placeholder="전문 분야, 차별화된 접근 방식, 주요 성과 등을 소개해주세요."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleInvestigatorSave}
                    disabled={savingInvestigator}
                    className="inline-flex items-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingInvestigator ? '저장 중...' : '민간조사원 정보 저장'}
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
