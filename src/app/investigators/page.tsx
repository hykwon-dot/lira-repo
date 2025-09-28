"use client";

import Image from "next/image";
import Link from "next/link";
import { InvestigatorStatus } from "@prisma/client";
import { Star } from "lucide-react";
import { useEffect, useState } from "react";

type InvestigatorRecord = {
  id: number;
  status: InvestigatorStatus;
  licenseNumber: string | null;
  contactPhone: string | null;
  serviceArea: string | null;
  introduction: string | null;
  specialties: unknown;
  experienceYears: number | null;
  ratingAverage: number | null;
  successRate: number | null;
  portfolioUrl: string | null;
  avatarUrl: string | null;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
  } | null;
};

type ApiResponse = {
  investigators: InvestigatorRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

const statusLabel: Record<InvestigatorStatus, string> = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "승인 거절",
};

const statusColor: Record<InvestigatorStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800",
};

const avatarGradientPalette = [
  "from-[#5b8def] to-[#2f57d3]",
  "from-[#f973c4] to-[#ec4899]",
  "from-[#a855f7] to-[#6366f1]",
  "from-[#34d399] to-[#059669]",
  "from-[#f97316] to-[#ef4444]",
  "from-[#14b8a6] to-[#0ea5e9]",
];

function getAvatarGradient(id: number) {
  return avatarGradientPalette[id % avatarGradientPalette.length];
}

function getInitials(name: string | null | undefined) {
  if (!name) return "L";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatSpecialties(specialties: unknown): string[] {
  if (Array.isArray(specialties)) {
    return specialties.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "label" in item) {
        return String((item as Record<string, unknown>).label ?? "");
      }
      return JSON.stringify(item);
    });
  }
  if (specialties && typeof specialties === "object") {
    return Object.values(specialties as Record<string, unknown>).map((value) =>
      typeof value === "string" ? value : JSON.stringify(value)
    );
  }
  return [];
}

export default function InvestigatorsPage() {
  const [investigators, setInvestigators] = useState<InvestigatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function fetchInvestigators() {
      try {
        setLoading(true);
        const response = await fetch('/api/investigators?status=APPROVED');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data: ApiResponse = await response.json();
        setInvestigators(data.investigators);
        setHasError(false);
      } catch (error) {
        console.error('Failed to fetch investigators:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        setInvestigators([]);
      } finally {
        setLoading(false);
      }
    }

    fetchInvestigators();
  }, []);

  const totalInvestigators = investigators.length;
  const totalExperience = investigators.reduce(
    (sum, inv) => sum + (typeof inv.experienceYears === "number" ? inv.experienceYears : 0),
    0,
  );
  const averageExperience = totalInvestigators
    ? (totalExperience / totalInvestigators).toFixed(1)
    : null;

  const specialtyFrequency = new Map<string, number>();
  investigators.forEach((inv) => {
    const specialties = formatSpecialties(inv.specialties);
    specialties.forEach((item) => {
      specialtyFrequency.set(item, (specialtyFrequency.get(item) ?? 0) + 1);
    });
  });

  const topSpecialties = Array.from(specialtyFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-white pb-20 pt-16">
      <div className="lira-container flex flex-col gap-12">
        <header className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/80 px-8 py-12 shadow-[0_30px_80px_-45px_rgba(30,64,175,0.35)] backdrop-blur">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-[#d6e0ff] to-transparent opacity-70 lg:block" />
          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">
                Investigator Directory
              </span>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight text-[#101828] sm:text-5xl">신뢰할 수 있는 민간조사 네트워크</h1>
                <p className="text-base leading-relaxed text-slate-500">
                  승인 완료된 LIRA 민간조사원의 전문 역량과 성공 사례를 한눈에 비교하고, 사건 유형에 맞는 파트너를 선택하세요. 실시간 요청과 맞춤 추천을 통해 빠르게 협업을 시작할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-3 text-sm md:flex-row">
              <Link href="/register?role=investigator" className="lira-button lira-button--secondary justify-center">
                민간조사원 등록 안내 ↗
              </Link>
              <Link href="/investigation-requests/new" className="lira-button lira-button--primary justify-center">
                사건 의뢰 등록하기 ↗
              </Link>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">등록 탐정</p>
              <p className="mt-4 flex items-baseline gap-2 text-4xl font-semibold text-[#101828]">
                {totalInvestigators}
                <span className="text-sm font-medium text-slate-500">명</span>
              </p>
              <p className="mt-3 text-xs text-slate-500">관리자 심사를 통과한 탐정만 신뢰할 수 있는 프로필로 소개됩니다.</p>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">평균 경력</p>
              <p className="mt-4 flex items-baseline gap-2 text-4xl font-semibold text-[#101828]">
                {averageExperience ?? "-"}
                <span className="text-sm font-medium text-slate-500">년</span>
              </p>
              <p className="mt-3 text-xs text-slate-500">검증된 현장 경험을 바탕으로 사건 매칭 품질을 보장합니다.</p>
            </article>
            <article className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">인기 전문 분야</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                {topSpecialties.length === 0 ? (
                  <span className="text-slate-400">등록된 전문 분야 데이터가 곧 업데이트됩니다.</span>
                ) : (
                  topSpecialties.map(([label, count]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700"
                    >
                      {label}
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{count}</span>
                    </span>
                  ))
                )}
              </div>
            </article>
          </div>
        </header>

        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-[#101828]">활동 중인 민간조사원</h2>
            <p className="text-sm text-slate-500">
              사건 유형, 예산, 지역 조건에 맞는 전문 파트너를 탐색해보세요. 선택한 탐정에게 바로 의뢰를 보낼 수 있습니다.
            </p>
          </div>

          {loading ? (
            <div className="rounded-[32px] border border-slate-200 bg-white/80 p-14 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-sm text-slate-500">조사원 목록을 불러오는 중...</p>
            </div>
          ) : hasError ? (
            <div className="rounded-[32px] border border-red-200 bg-red-50/80 p-14 text-center">
              <h3 className="text-lg font-semibold text-red-800 mb-2">데이터를 불러올 수 없습니다</h3>
              <p className="text-sm text-red-600 mb-4">
                데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.
              </p>
              <p className="text-xs text-red-500 font-mono bg-red-100 p-2 rounded">
                {errorMessage}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : investigators.length === 0 ? (
            <div className="rounded-[32px] border border-dashed border-slate-200 bg-white/80 p-14 text-center text-sm text-slate-500">
              아직 승인 완료된 민간조사원이 없습니다. 등록 심사를 통과하면 이곳에 노출됩니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {investigators.map((inv) => {
                const specialties = formatSpecialties(inv.specialties);
                const status = inv.status as InvestigatorStatus;
                const initials = getInitials(inv.user?.name);
                const updatedAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(inv.updatedAt));

                return (
                  <article key={inv.id} className="flex h-full flex-col rounded-[32px] border border-slate-100 bg-white/90 shadow-[0_18px_40px_-28px_rgba(30,64,175,0.45)]">
                    <div className="relative overflow-hidden">
                      <div className="relative aspect-square w-full overflow-hidden">
                        {inv.avatarUrl ? (
                          <Image
                            src={inv.avatarUrl}
                            alt={`${inv.user?.name ?? "이름 미상"} 프로필 이미지`}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className={`flex aspect-square w-full items-center justify-center bg-gradient-to-br ${getAvatarGradient(inv.id)} text-4xl font-semibold uppercase tracking-wide text-white`}
                            aria-hidden
                          >
                            {initials}
                          </div>
                        )}
                      </div>
                      <span className={`absolute right-4 top-4 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${statusColor[status]}`}>
                        {statusLabel[status]}
                      </span>
                    </div>

                    <div className="flex grow flex-col gap-6 p-6">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-[#101828]">{inv.user?.name ?? "이름 미상"}</p>
                            <p className="truncate text-xs text-slate-500">{inv.user?.email}</p>
                            {inv.contactPhone && (
                              <p className="mt-1 text-xs text-slate-500">☎ {inv.contactPhone}</p>
                            )}
                          </div>
                        </div>
                        {inv.introduction && (
                          <p className="text-sm leading-relaxed text-slate-600 line-clamp-3">{inv.introduction}</p>
                        )}
                      </div>

                      <dl className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">경력</dt>
                          <dd className="mt-2 text-sm font-semibold text-[#101828]">
                            {inv.experienceYears ? `${inv.experienceYears}년` : "정보 없음"}
                          </dd>
                        </div>
                        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">평균 평점</dt>
                          <dd className="mt-2 text-sm font-semibold text-[#101828]">
                            {inv.ratingAverage ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, idx) => {
                                    const filled = Number(inv.ratingAverage) >= idx + 1;
                                    return (
                                      <Star
                                        key={`${inv.id}-rating-${idx}`}
                                        className={`h-4 w-4 ${filled ? "fill-current" : "fill-transparent"}`}
                                        strokeWidth={1.5}
                                      />
                                    );
                                  })}
                                </div>
                                <span>
                                  {Number(inv.ratingAverage).toFixed(1)}
                                  <span className="ml-1 text-xs font-medium text-slate-400">/ 5.0</span>
                                </span>
                              </div>
                            ) : (
                              "데이터 없음"
                            )}
                          </dd>
                        </div>
                        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">성공률</dt>
                          <dd className="mt-2 text-sm font-semibold text-[#101828]">
                            {inv.successRate ? `${Number(inv.successRate).toFixed(1)}%` : "데이터 없음"}
                          </dd>
                        </div>
                        <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">활동 지역</dt>
                          <dd className="mt-2 text-sm font-semibold text-[#101828]">
                            {inv.serviceArea ?? "정보 없음"}
                          </dd>
                        </div>
                      </dl>

                      <div className="space-y-3 text-xs text-slate-500">
                        <div>
                          <dt className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-400">전문 분야</dt>
                          <dd className="mt-2 flex flex-wrap gap-2">
                            {specialties.length > 0 ? (
                              specialties.map((item, idx) => (
                                <span
                                  key={`${inv.id}-spec-${idx}`}
                                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-700"
                                >
                                  {item}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">등록된 전문 분야 정보가 없습니다.</span>
                            )}
                          </dd>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/investigation-requests/new?investigatorId=${inv.id}`}
                            className="lira-button lira-button--primary justify-center"
                          >
                            사건 의뢰하기 ↗
                          </Link>
                          {inv.portfolioUrl && (
                            <Link
                              href={inv.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="lira-button lira-button--secondary justify-center"
                            >
                              포트폴리오 보기 ↗
                            </Link>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400">최근 업데이트: {updatedAt}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
