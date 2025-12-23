"use client";

import { useEffect, useMemo, useState } from 'react';
import { useUserStore } from '@/lib/userStore';

type SimulationRunReport = {
  id: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  scenario: {
    id: number;
    title: string;
    category: string | null;
    difficulty: string | null;
  } | null;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  _count?: {
    events: number;
  };
};

export default function ReportDashboard() {
  const token = useUserStore((state) => state.token);
  const currentUser = useUserStore((state) => state.user);
  const [runs, setRuns] = useState<SimulationRunReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdminUser = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (!token) {
      setRuns([]);
      return;
    }

    setLoading(true);
    setError(null);

    fetch('/api/simulation/runs?limit=50', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('보고서 데이터를 불러오지 못했습니다.');
        }
        const data = await response.json();
        setRuns(Array.isArray(data.items) ? data.items : []);
      })
      .catch((err: unknown) => {
        console.error('[ReportDashboard] fetch error', err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const summary = useMemo(() => {
    if (runs.length === 0) {
      return {
        totalRuns: 0,
        activeRuns: 0,
        completedRuns: 0,
        averageEvents: 0,
      };
    }

    const completedRuns = runs.filter((run) => run.status === 'COMPLETED').length;
    const activeRuns = runs.filter((run) => run.status === 'ACTIVE').length;
    const eventTotal = runs.reduce((acc, run) => acc + (run._count?.events ?? 0), 0);

    return {
      totalRuns: runs.length,
      activeRuns,
      completedRuns,
      averageEvents: eventTotal === 0 ? 0 : Math.round((eventTotal / runs.length) * 10) / 10,
    };
  }, [runs]);

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <h2 className="text-2xl font-bold mb-2">데이터 분석 & 보고서</h2>
        <p className="text-slate-400 text-sm">로그인한 관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">데이터 분석 & 보고서</h2>
          <p className="text-sm text-slate-400">
            최근 시뮬레이션 런 50건의 상태와 이벤트 로그를 집계합니다.
          </p>
        </div>
        {isAdminUser ? (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            관리자 모드
          </span>
        ) : (
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/30">
            사용자 모드
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="총 런" value={summary.totalRuns} accent="text-sky-400" />
        <SummaryCard title="진행 중" value={summary.activeRuns} accent="text-amber-400" />
        <SummaryCard title="완료됨" value={summary.completedRuns} accent="text-emerald-400" />
        <SummaryCard
          title="평균 이벤트"
          value={summary.averageEvents}
          accent="text-purple-400"
          formatter={(value) => `${value}건`}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90 text-slate-300 uppercase text-xs tracking-wide">
            <tr>
              <th className="p-3 text-left">사용자</th>
              <th className="p-3 text-left">시나리오</th>
              <th className="p-3 text-left">상태</th>
              <th className="p-3 text-right">이벤트</th>
              <th className="p-3 text-left">시작</th>
              <th className="p-3 text-left">완료</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  아직 수집된 시뮬레이션 런이 없습니다.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-t border-slate-800/80">
                  <td className="p-3 text-slate-200">
                    <div className="flex flex-col">
                      <span className="font-semibold">{run.user?.name ?? '익명'}</span>
                      <span className="text-xs text-slate-500">{run.user?.email}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-200">
                    <div className="flex flex-col">
                      <span>{run.scenario?.title ?? '-'}</span>
                      <span className="text-xs text-slate-500">
                        {run.scenario?.category ?? '카테고리 없음'} • {run.scenario?.difficulty ?? '난이도 미정'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <StatusPill status={run.status} />
                  </td>
                  <td className="p-3 text-right text-slate-200">
                    {run._count?.events ?? 0}
                  </td>
                  <td className="p-3 text-slate-300">{formatDate(run.startedAt)}</td>
                  <td className="p-3 text-slate-300">{run.completedAt ? formatDate(run.completedAt) : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  accent,
  formatter,
}: {
  title: string;
  value: number;
  accent?: string;
  formatter?: (value: number) => string;
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4">
      <p className="text-xs uppercase text-slate-500 mb-2 tracking-wider">{title}</p>
      <p className={`text-2xl font-semibold ${accent ?? 'text-white'}`}>
        {formatter ? formatter(value) : value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const variants: Record<string, string> = {
    ACTIVE: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    COMPLETED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    CANCELLED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  };

  const style = variants[normalized] ?? 'bg-slate-500/10 text-slate-300 border-slate-500/30';

  return (
    <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-semibold ${style}`}>
      {normalized}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
