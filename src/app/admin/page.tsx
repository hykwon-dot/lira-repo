"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/lib/userStore';
import ScenarioAdmin from './ScenarioAdmin';
import AdminFeedback from './AdminFeedback';
import Image from 'next/image';
import Link from 'next/link';

type RequestStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

type Investigator = {
  id: number;
  licenseNumber: string | null;
  experienceYears: number;
  specialties: unknown;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  contactPhone: string | null;
  businessLicenseUrl: string | null;
  pledgeUrl: string | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
};

type InvestigationRequest = {
  id: number;
  title: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  desiredOutcome: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  scenario: {
    id: number;
    title: string;
    category: string | null;
    difficulty: string | null;
  } | null;
};

type ScenarioSummary = {
  id: number;
  title: string;
  category: string | null;
  difficulty: string | null;
  createdAt: string;
};

type CustomerSummary = {
  id: number;
  displayName: string | null;
  phone: string | null;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
};

type DashboardStats = {
  totalUsers: number;
  newUsersWeek: number;
  investigator: Record<string, number>;
  requests: Record<string, number>;
  activeScenarios: number;
};

type DashboardResponse = {
  stats: DashboardStats;
  pendingInvestigators: Investigator[];
  recentRequests: InvestigationRequest[];
  trendingScenarios: ScenarioSummary[];
  activeInvestigators: Investigator[];
  recentCustomers: CustomerSummary[];
};

type StatCard = {
  title: string;
  value: string;
  description: string;
  accent: string;
};

const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  OPEN: '신규 접수',
  UNDER_REVIEW: '검토 중',
  ASSIGNED: '배정 완료',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  OPEN: ['UNDER_REVIEW', 'ASSIGNED', 'CANCELLED'],
  UNDER_REVIEW: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const formatNumber = (value: number | undefined) =>
  typeof value === 'number' ? value.toLocaleString('ko-KR') : '-';

const formatDate = (value: string) =>
  value ? new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-';

const chipList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string') as string[];
  }
  if (value && typeof value === 'object') {
    return Object.values(value).filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') {
    return [value];
  }
  return [];
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const palette: Record<RequestStatus, string> = {
    OPEN: 'bg-blue-50 text-blue-600 border-blue-200',
    UNDER_REVIEW: 'bg-amber-50 text-amber-600 border-amber-200',
    ASSIGNED: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    IN_PROGRESS: 'bg-purple-50 text-purple-600 border-purple-200',
    COMPLETED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${palette[status]}`}
    >
      {REQUEST_STATUS_LABEL[status]}
    </span>
  );
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removingInvestigatorId, setRemovingInvestigatorId] = useState<number | null>(null);
  const [removingCustomerId, setRemovingCustomerId] = useState<number | null>(null);
  const { user, token, setUser, logout } = useUserStore();
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const isAuthorized = user && (user.role === 'admin' || user.role === 'super_admin');

  const resolveAuthToken = useCallback(() => {
    if (token) return token;
    if (typeof window === 'undefined') return null;
    try {
      return sessionStorage.getItem('lira.authToken');
    } catch (storageError) {
      console.warn('Failed to read auth token', storageError);
      return null;
    }
  }, [token]);

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data?.error ?? '관리자 인증에 실패했습니다.');
        return;
      }

      if (!data?.user || !data?.token) {
        setAuthError('로그인 응답이 올바르지 않습니다.');
        return;
      }

      const normalizedRole = String(data.user.role ?? '').toLowerCase();
      if (normalizedRole !== 'admin' && normalizedRole !== 'super_admin') {
        setAuthError('관리자 권한이 없는 계정입니다.');
        return;
      }

      try {
        sessionStorage.setItem('lira.authToken', data.token);
      } catch (storageError) {
        console.warn('Failed to persist auth token', storageError);
      }

      setUser(
        {
          id: String(data.user.id ?? ''),
          email: data.user.email,
          name: data.user.name ?? '',
          role: normalizedRole,
          monthlyUsage: data.user.monthlyUsage ?? 0,
          remainingTokens: data.user.remainingTokens ?? 0,
          investigatorStatus: data.user.investigatorStatus ?? undefined,
        },
        data.token,
      );
    } catch (loginError) {
      console.error('Admin gate login failed', loginError);
      setAuthError('관리자 인증 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const authToken = resolveAuthToken();
        const headers: HeadersInit = authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {};
        const res = await fetch('/api/admin/dashboard', {
          headers,
          cache: 'no-store',
        });
        if (res.status === 401 || res.status === 403) {
          setError('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
          setDashboard(null);
          logout();
          return;
        }
        if (!res.ok) {
          throw new Error('대시보드 데이터를 불러오지 못했습니다.');
        }
        const data = (await res.json()) as DashboardResponse;
        setDashboard(data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    if (isAuthorized) {
      load();
    }
  }, [isAuthorized, logout, resolveAuthToken]);

  const handleApproveInvestigator = async (id: number) => {
    if (!dashboard) return;
    setApprovingId(id);
    try {
      const authToken = resolveAuthToken();
      if (!authToken) {
        setError('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
      }
      const res = await fetch(`/api/admin/investigators/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? '승인에 실패했습니다.');
      }
      const approvedInvestigator = payload?.investigator as Investigator | undefined;

      setDashboard((prev) => {
        if (!prev) return prev;
        const updatedPending = prev.pendingInvestigators.filter((inv) => inv.id !== id);
        return {
          ...prev,
          stats: {
            ...prev.stats,
            investigator: {
              ...prev.stats.investigator,
              PENDING: Math.max((prev.stats.investigator.PENDING ?? 1) - 1, 0),
              APPROVED: (prev.stats.investigator.APPROVED ?? 0) + 1,
            },
          },
          pendingInvestigators: updatedPending,
          activeInvestigators: approvedInvestigator
            ? [approvedInvestigator, ...prev.activeInvestigators]
            : prev.activeInvestigators,
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '조사원 승인 중 오류가 발생했습니다.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRequestStatusChange = async (id: number, status: RequestStatus) => {
    if (!dashboard) return;
    setUpdatingId(id);
    try {
      const authToken = resolveAuthToken();
      if (!authToken) {
        setError('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
      }
      const res = await fetch(`/api/admin/investigation-requests/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? '상태 갱신에 실패했습니다.');
      }
      const { request } = (await res.json()) as { request: InvestigationRequest };
      setDashboard((prev) => {
        if (!prev) return prev;
        const updatedRequests = prev.recentRequests.map((item) =>
          item.id === id ? { ...item, status: request.status, updatedAt: request.updatedAt } : item,
        );

        const current = prev.recentRequests.find((item) => item.id === id);
        const stats = { ...prev.stats.requests };
        if (current) {
          stats[current.status] = Math.max((stats[current.status] ?? 1) - 1, 0);
        }
        stats[request.status] = (stats[request.status] ?? 0) + 1;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            requests: stats,
          },
          recentRequests: updatedRequests,
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveInvestigator = async (profileId: number) => {
    if (!dashboard) return;
    setRemovingInvestigatorId(profileId);
    try {
      const authToken = resolveAuthToken();
      if (!authToken) {
        setError('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
      }
      const res = await fetch(`/api/admin/investigators/${profileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? '조사원 삭제에 실패했습니다.');
      }

      setDashboard((prev) => {
        if (!prev) return prev;
        const pendingRemoved = prev.pendingInvestigators.some((item) => item.id === profileId);
        const activeRemoved = prev.activeInvestigators.some((item) => item.id === profileId);
        const investigatorStats = { ...prev.stats.investigator };
        if (pendingRemoved) {
          investigatorStats.PENDING = Math.max((investigatorStats.PENDING ?? 1) - 1, 0);
        }
        if (activeRemoved) {
          investigatorStats.APPROVED = Math.max((investigatorStats.APPROVED ?? 1) - 1, 0);
        }
        return {
          ...prev,
          stats: {
            ...prev.stats,
            investigator: investigatorStats,
          },
          pendingInvestigators: prev.pendingInvestigators.filter((item) => item.id !== profileId),
          activeInvestigators: prev.activeInvestigators.filter((item) => item.id !== profileId),
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '조사원 삭제 중 오류가 발생했습니다.');
    } finally {
      setRemovingInvestigatorId(null);
    }
  };

  const handleRemoveCustomer = async (customerProfileId: number) => {
    if (!dashboard) return;
    setRemovingCustomerId(customerProfileId);
    try {
      const authToken = resolveAuthToken();
      if (!authToken) {
        setError('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
        logout();
        return;
      }
      const res = await fetch(`/api/admin/customers/${customerProfileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error ?? '고객 삭제에 실패했습니다.');
      }

      setDashboard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalUsers: Math.max(prev.stats.totalUsers - 1, 0),
          },
          recentCustomers: prev.recentCustomers.filter((item) => item.id !== customerProfileId),
        };
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : '고객 삭제 중 오류가 발생했습니다.');
    } finally {
      setRemovingCustomerId(null);
    }
  };

  const statCards = useMemo<StatCard[]>(() => {
    if (!dashboard) return [];
    const { stats } = dashboard;
    return [
      {
        title: '전체 이용자',
        value: formatNumber(stats.totalUsers),
        description: `지난 7일 신규 ${formatNumber(stats.newUsersWeek)}명`,
        accent: 'from-sky-500/10 to-sky-500/0 text-sky-700 border-sky-100',
      },
      {
        title: '승인 대기 조사원',
        value: formatNumber(stats.investigator.PENDING ?? 0),
        description: `전체 승인 ${formatNumber(stats.investigator.APPROVED ?? 0)}명`,
        accent: 'from-amber-500/10 to-amber-500/0 text-amber-700 border-amber-100',
      },
      {
        title: '열린 의뢰 건수',
        value: formatNumber(stats.requests.OPEN ?? 0),
        description: `검토 중 ${formatNumber(stats.requests.UNDER_REVIEW ?? 0)}건`,
        accent: 'from-indigo-500/10 to-indigo-500/0 text-indigo-700 border-indigo-100',
      },
      {
        title: '활성 시나리오',
        value: formatNumber(stats.activeScenarios),
        description: '신규 시나리오 관리',
        accent: 'from-emerald-500/10 to-emerald-500/0 text-emerald-700 border-emerald-100',
      },
    ];
  }, [dashboard]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-lg backdrop-blur">
          <h1 className="text-center text-2xl font-bold text-slate-800">관리자 인증</h1>
          <p className="mt-3 text-center text-sm text-slate-500">
            관리자 아이디와 비밀번호를 입력해야 운영 대시보드에 접근할 수 있습니다.
          </p>
          {authError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-center text-sm text-rose-600">
              {authError}
            </div>
          )}
          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600" htmlFor="adminEmail">
                관리자 이메일
              </label>
              <input
                id="adminEmail"
                type="email"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-600" htmlFor="adminPassword">
                비밀번호
              </label>
              <input
                id="adminPassword"
                type="password"
                value={adminPassword}
                onChange={(event) => setAdminPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {authLoading ? '확인 중…' : '관리자 대시보드 입장'}
            </button>
          </form>
          {user && user.role !== 'admin' && user.role !== 'super_admin' && (
            <button
              type="button"
              onClick={() => {
                logout();
                setAdminEmail('');
                setAdminPassword('');
              }}
              className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              다른 계정으로 로그인하기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f9ff] via-[#eef2fb] to-white py-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 lg:px-8">
        <header className="rounded-3xl bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-500">Admin Control Center</p>
              <h1 className="mt-3 text-3xl font-extrabold text-[#1a2340] lg:text-4xl">
                서비스 운영 인사이트 현황
              </h1>
              <p className="mt-2 text-sm text-[#4b587c]">
                AI 조사 시뮬레이션 서비스 전반의 지표와 워크플로우를 한 눈에 확인하고, 의뢰 및 민간조사원 흐름을 빠르게 조율하세요.
              </p>
            </div>
            <Image src="/globe.svg" alt="dashboard" width={96} height={96} className="mx-auto lg:mx-0" />
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {loading && !dashboard
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur"
                >
                  <div className="flex flex-col gap-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))
            : statCards.map((card, index) => (
                <div
                  key={index}
                  className={`relative overflow-hidden rounded-3xl border bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md ${card.accent}`}
                >
                  <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {card.title}
                    </p>
                    <p className="text-3xl font-black">{card.value}</p>
                    <p className="text-xs text-slate-500">{card.description}</p>
                  </div>
                </div>
              ))}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Link href="/admin/banners" className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">배너 관리</h3>
                <p className="text-sm text-slate-500">메인 페이지 배너 및 프로모션 관리</p>
              </div>
              <div className="rounded-full bg-blue-50 p-3 text-blue-600 group-hover:bg-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
            </div>
          </Link>
          <Link href="/admin/awards" className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">수상 내역 관리</h3>
                <p className="text-sm text-slate-500">수상 실적 및 인증 내역 관리</p>
              </div>
              <div className="rounded-full bg-amber-50 p-3 text-amber-600 group-hover:bg-amber-100">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0V5.625a2.25 2.25 0 11-4.5 0v9.75m0-9.75a2.25 2.25 0 012.25-2.25h.008c.621 0 1.125.504 1.125 1.125m0 0v1.125m-2.25 0h2.25" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
          <section className="col-span-1 space-y-5">
            <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1a2340]">승인 대기 조사원</h2>
                <span className="text-sm text-slate-500">
                  {dashboard?.pendingInvestigators.length ?? 0}명의 신청자
                </span>
              </div>

              {loading && !dashboard && (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4" />
                  ))}
                </div>
              )}

              {!loading && dashboard?.pendingInvestigators.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                  현재 승인 대기 중인 조사원이 없습니다.
                </div>
              )}

              <div className="space-y-4">
                {dashboard?.pendingInvestigators.map((inv) => {
                  const specialties = chipList(inv.specialties).slice(0, 4);
                  return (
                    <div key={inv.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/60 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-[#1a2340]">
                              {inv.user.name || '이름 미기재'}
                            </p>
                            <p className="text-xs text-slate-500">{inv.user.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveInvestigator(inv.id)}
                              disabled={approvingId === inv.id}
                              className="inline-flex items-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              {approvingId === inv.id ? '승인 중…' : '승인 완료'}
                            </button>
                            <button
                              onClick={() => handleRemoveInvestigator(inv.id)}
                              disabled={removingInvestigatorId === inv.id}
                              className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {removingInvestigatorId === inv.id ? '삭제 중…' : '삭제'}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">경력</p>
                            <p className="mt-1 text-sm font-semibold text-[#1a2340]">
                              {inv.experienceYears}년
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/80 p-3">
                            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400">자격번호</p>
                            <p className="mt-1 text-sm font-semibold text-[#1a2340]">
                              {inv.licenseNumber || '미제공'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {inv.businessLicenseUrl ? (
                            <Link
                              href={
                                inv.businessLicenseUrl.startsWith('/api/') && token
                                  ? `${inv.businessLicenseUrl}&token=${token}`
                                  : inv.businessLicenseUrl
                              }
                              target="_blank"
                              className="flex-1 rounded-xl bg-slate-100 py-2 text-center text-xs text-slate-600 transition hover:bg-slate-200"
                            >
                              📄 사업자등록증
                            </Link>
                          ) : (
                            <span className="flex-1 cursor-not-allowed rounded-xl bg-slate-50 py-2 text-center text-xs text-slate-300">
                              사업자등록증 미첨부
                            </span>
                          )}
                          {inv.pledgeUrl ? (
                            <Link
                              href={
                                inv.pledgeUrl.startsWith('/api/') && token
                                  ? `${inv.pledgeUrl}&token=${token}`
                                  : inv.pledgeUrl
                              }
                              target="_blank"
                              className="flex-1 rounded-xl bg-slate-100 py-2 text-center text-xs text-slate-600 transition hover:bg-slate-200"
                            >
                              📝 서약서
                            </Link>
                          ) : (
                            <span className="flex-1 cursor-not-allowed rounded-xl bg-slate-50 py-2 text-center text-xs text-slate-300">
                              서약서 미첨부
                            </span>
                          )}
                        </div>

                        {specialties.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {specialties.map((spec) => (
                              <span
                                key={spec}
                                className="rounded-full bg-slate-100 px-3 py-1 text-[0.65rem] text-slate-600"
                              >
                                #{spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
              <h2 className="text-xl font-semibold text-[#1a2340]">주요 시나리오 인사이트</h2>
              <p className="mt-1 text-sm text-slate-500">최근 등록된 AI 시나리오를 확인하고 운영 전략을 조정하세요.</p>
              <div className="mt-4 space-y-3">
                {dashboard?.trendingScenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="rounded-2xl border border-slate-100 bg-gradient-to-r from-white to-slate-50/60 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#1a2340]">{scenario.title}</p>
                      <span className="text-xs text-slate-400">{formatDate(scenario.createdAt)}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      {scenario.category && <span className="rounded-full bg-slate-100 px-3 py-1">{scenario.category}</span>}
                      {scenario.difficulty && (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                          난이도 {scenario.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {dashboard && dashboard.trendingScenarios.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-500">
                    아직 등록된 시나리오가 없습니다. 시나리오 라이브러리를 확장해보세요.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="col-span-1 xl:col-span-2 rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1a2340]">의뢰 진행 현황</h2>
                <p className="text-sm text-slate-500">
                  고객 의뢰가 어떤 상태에 있는지 확인하고, 원클릭으로 다음 단계를 지정하세요.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                열람 중인 데이터는 최신 6건입니다.
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full table-fixed border-collapse">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">의뢰 제목</th>
                    <th className="px-4 py-3">고객</th>
                    <th className="px-4 py-3">연결 시나리오</th>
                    <th className="px-4 py-3">현재 상태</th>
                    <th className="px-4 py-3">다음 단계</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-sm">
                  {loading && !dashboard && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        데이터를 불러오는 중입니다…
                      </td>
                    </tr>
                  )}

                  {dashboard?.recentRequests.map((request) => {
                    const transitions = STATUS_TRANSITIONS[request.status] ?? [];
                    return (
                      <tr key={request.id} className="border-t border-slate-100">
                        <td className="px-4 py-4 font-semibold text-[#1a2340]">
                          <div>{request.title}</div>
                          <div className="mt-1 text-xs text-slate-400">{formatDate(request.createdAt)} 접수</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-600">
                            {request.user?.name ?? '익명' }
                          </div>
                          <div className="text-xs text-slate-400">{request.user?.email ?? '-'}</div>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {request.scenario ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-slate-600">{request.scenario.title}</span>
                              {request.scenario.category && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem]">
                                  {request.scenario.category}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">미연결</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={request.status} />
                        </td>
                        <td className="px-4 py-4">
                          {transitions.length > 0 ? (
                            <select
                              className="w-40 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                              defaultValue=""
                              onChange={(e) => {
                                const value = e.target.value as RequestStatus;
                                if (!value) return;
                                handleRequestStatusChange(request.id, value);
                                e.target.value = '';
                              }}
                              disabled={updatingId === request.id}
                            >
                              <option value="" disabled>
                                {updatingId === request.id ? '업데이트 중…' : '상태 선택'}
                              </option>
                              {transitions.map((status) => (
                                <option key={status} value={status}>
                                  {REQUEST_STATUS_LABEL[status]}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-400">변경 가능한 상태 없음</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {dashboard && dashboard.recentRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        현재 등록된 의뢰가 없습니다. 고객 의뢰가 생성되면 여기에서 확인할 수 있습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1a2340]">승인된 조사원 명단</h2>
                <p className="text-sm text-slate-500">서비스에 참여 중인 조사원을 관리하고 필요 시 즉시 비활성화하세요.</p>
              </div>
              <span className="text-xs text-slate-400">최근 업데이트 기준</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full table-fixed border-collapse">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">조사원</th>
                    <th className="px-4 py-3">전문 분야</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-sm">
                  {dashboard?.activeInvestigators.map((inv) => {
                    const specialties = chipList(inv.specialties).slice(0, 3);
                    return (
                      <tr key={inv.id} className="border-t border-slate-100">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-[#1a2340]">{inv.user.name ?? '이름 미기재'}</div>
                          <div className="text-xs text-slate-400">{inv.user.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          {specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {specialties.map((spec) => (
                                <span key={spec} className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] text-slate-500">
                                  #{spec}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">전문 분야 미등록</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">{inv.contactPhone ?? '-'}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => handleRemoveInvestigator(inv.id)}
                            disabled={removingInvestigatorId === inv.id}
                            className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {removingInvestigatorId === inv.id ? '삭제 중…' : '삭제'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {dashboard && dashboard.activeInvestigators.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                        아직 승인된 조사원이 없습니다. 승인을 완료하면 명단이 표시됩니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1a2340]">최근 가입 고객</h2>
                <p className="text-sm text-slate-500">신규 고객 정보를 빠르게 확인하고, 필요 시 계정을 정리하세요.</p>
              </div>
              <span className="text-xs text-slate-400">최근 8명</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full table-fixed border-collapse">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">고객</th>
                    <th className="px-4 py-3">연락처</th>
                    <th className="px-4 py-3">가입일</th>
                    <th className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="bg-white text-sm">
                  {dashboard?.recentCustomers.map((customer) => (
                    <tr key={customer.id} className="border-t border-slate-100">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#1a2340]">{customer.displayName || customer.user.name || '이름 미기재'}</div>
                        <div className="text-xs text-slate-400">{customer.user.email}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{customer.phone ?? '-'}</td>
                      <td className="px-4 py-4 text-xs text-slate-400">
                        {new Date(customer.createdAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleRemoveCustomer(customer.id)}
                          disabled={removingCustomerId === customer.id}
                          className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          {removingCustomerId === customer.id ? '삭제 중…' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dashboard && dashboard.recentCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                        최근 가입한 고객이 없습니다. 신규 가입이 발생하면 여기에서 확인할 수 있습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/window.svg" alt="시나리오 관리" width={32} height={32} />
              <div>
                <h2 className="text-xl font-semibold text-[#1a2340]">시나리오 라이브러리</h2>
                <p className="text-sm text-slate-500">운영 중인 시나리오를 추가하거나 상세 구성을 확인하세요.</p>
              </div>
            </div>
            <ScenarioAdmin />
          </div>
          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/file.svg" alt="피드백" width={32} height={32} />
              <div>
                <h2 className="text-xl font-semibold text-[#1a2340]">운영 노트 및 피드백</h2>
                <p className="text-sm text-slate-500">AI 시뮬레이션 품질 개선 아이디어와 QA 히스토리를 관리하세요.</p>
              </div>
            </div>
            <AdminFeedback />
          </div>
        </section>
      </div>
    </div>
  );
}
