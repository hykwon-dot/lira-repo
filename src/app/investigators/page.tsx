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

const SPECIALTY_MAPPING: Record<string, string> = {
  'INFIDELITY': '배우자/가정 이슈',
  'MISSING_PERSON': '실종 및 추적',
  'CORPORATE': '기업 내부 조사',
  'DIGITAL_FORENSICS': '디지털 포렌식',
  'BACKGROUND_CHECK': '신원 조회',
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
  let items: string[] = [];
  if (Array.isArray(specialties)) {
    items = specialties.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "label" in item) {
        return String((item as Record<string, unknown>).label ?? "");
      }
      return JSON.stringify(item);
    });
  } else if (specialties && typeof specialties === "object") {
    items = Object.values(specialties as Record<string, unknown>).map((value) =>
      typeof value === "string" ? value : JSON.stringify(value)
    );
  }
  
  return items.map(item => SPECIALTY_MAPPING[item] || item);
}

export default function InvestigatorsPage() {
  const [investigators, setInvestigators] = useState<InvestigatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
    <div className="min-h-screen bg-slate-50 pb-20 pt-16">
      <div className="lira-container flex flex-col gap-12">
        <header className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              Investigator Directory
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                검증된 민간조사 전문가
              </h1>
              <p className="text-lg leading-relaxed text-slate-600">
                LIRA의 엄격한 심사를 통과한 전문 탐정들을 만나보세요.<br className="hidden sm:block" />
                분야별 최고의 전문가들이 당신의 문제를 해결해드립니다.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link 
              href="/register?role=investigator" 
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              탐정 등록 안내
            </Link>
            <Link 
              href="#investigator-list" 
              className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              사건 의뢰하기
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <dt className="text-sm font-medium text-slate-500">등록된 전문가</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{totalInvestigators}명</dd>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <dt className="text-sm font-medium text-slate-500">평균 경력</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{averageExperience ?? "-"}년</dd>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5">
            <dt className="text-sm font-medium text-slate-500">주요 전문 분야</dt>
            <dd className="mt-4 flex flex-wrap gap-2">
              {topSpecialties.length === 0 ? (
                <span className="text-sm text-slate-400">데이터 집계 중</span>
              ) : (
                topSpecialties.map(([label]) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                  >
                    {label}
                  </span>
                ))
              )}
            </dd>
          </div>
        </div>

        <section id="investigator-list" className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-5">
            <h2 className="text-xl font-semibold text-slate-900">전문가 목록</h2>
            <span className="text-sm text-slate-500">총 {investigators.length}명의 전문가가 활동 중입니다</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : hasError ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              데이터를 불러오는 중 오류가 발생했습니다.
            </div>
          ) : investigators.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              등록된 전문가가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {investigators.map((inv) => {
                const specialties = formatSpecialties(inv.specialties);
                const status = inv.status as InvestigatorStatus;
                const initials = getInitials(inv.user?.name);

                return (
                  <article 
                    key={inv.id} 
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md"
                  >
                    <div className="flex flex-1 flex-col p-6 sm:p-8">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-900/5">
                            {inv.avatarUrl ? (
                              <Image
                                src={inv.avatarUrl}
                                alt=""
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${getAvatarGradient(inv.id)} text-lg font-bold text-white`}>
                                {initials}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {inv.user?.name ?? "이름 미상"}
                            </h3>
                            <p className="text-sm text-slate-500">{inv.serviceArea ?? "활동 지역 미정"}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === 'APPROVED' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' :
                          status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20' :
                          'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10'
                        }`}>
                          {statusLabel[status]}
                        </span>
                      </div>

                      <div className="mt-6 flex items-center gap-6 border-y border-slate-100 py-4">
                        <div>
                          <div className="text-xs text-slate-500">경력</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {inv.experienceYears ? `${inv.experienceYears}년` : "-"}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-slate-100" />
                        <div>
                          <div className="text-xs text-slate-500">평점</div>
                          <div className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {inv.ratingAverage ? Number(inv.ratingAverage).toFixed(1) : "-"}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-slate-100" />
                        <div>
                          <div className="text-xs text-slate-500">성공률</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {inv.successRate ? `${Number(inv.successRate).toFixed(0)}%` : "-"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {inv.introduction && (
                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                            {inv.introduction}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {specialties.slice(0, 5).map((spec, i) => (
                            <span 
                              key={i}
                              className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10"
                            >
                              {spec}
                            </span>
                          ))}
                          {specialties.length > 5 && (
                            <span className="inline-flex items-center rounded-md bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
                              +{specialties.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                      <Link
                        href={`/investigation-requests/new?investigatorId=${inv.id}`}
                        className="flex w-full items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      >
                        의뢰하기
                      </Link>
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
