"use client";

import { useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ListFilter,
  Search,
  Sparkles,
  TrendingUp,
  Clock,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

export interface ProcessedScenario {
  id: number;
  title: string;
  description: string;
  image: string | null;
  totalDays: number;
  totalBudget: number;
  difficulty: string;
}

interface ScenarioLibraryProps {
  initialScenarios: ProcessedScenario[];
  totalCount: number;
  currentPage: number;
  limit: number;
}

const difficultyTone = {
  쉬움: {
    badge: 'text-emerald-600 bg-emerald-100',
    pill: 'text-emerald-600',
  },
  중간: {
    badge: 'text-amber-600 bg-amber-100',
    pill: 'text-amber-600',
  },
  어려움: {
    badge: 'text-rose-600 bg-rose-100',
    pill: 'text-rose-600',
  },
  default: {
    badge: 'text-slate-600 bg-slate-100',
    pill: 'text-slate-600',
  },
} as const;

const formatBudget = (amount: number) => {
  if (!amount) return '협의 필요';
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억원`;
  if (amount >= 10_000) return `${(amount / 10_000).toFixed(0)}만원`;
  return `${amount.toLocaleString()}원`;
};

export default function ScenarioLibrary({ initialScenarios, totalCount, currentPage, limit }: ScenarioLibraryProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [budgetFilter, setBudgetFilter] = useState('모든 예산');
  const [difficulty, setDifficulty] = useState('모든 난이도');
  const [sortBy, setSortBy] = useState('title-asc');

  const totalPages = Math.ceil(totalCount / limit);

  // Note: Client-side filtering/sorting will only work on the current page data.
  // In a real production app with 1000+ items, these should be handled by the API.
  // For now, we apply them to the current page's scenarios.
  const filteredScenarios = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return initialScenarios.filter((scenario) => {
      const matchesKeyword = keyword
        ? scenario.title.toLowerCase().includes(keyword) || scenario.description.toLowerCase().includes(keyword)
        : true;

      const matchesDifficulty = difficulty === '모든 난이도' || scenario.difficulty === difficulty;

      const matchesBudget = (() => {
        if (budgetFilter === '모든 예산') return true;
        const budget = scenario.totalBudget;
        switch (budgetFilter) {
          case '1,000만원 이하':
            return budget <= 10_000_000;
          case '1,000만원 - 5,000만원':
            return budget > 10_000_000 && budget <= 50_000_000;
          case '5,000만원 이상':
            return budget > 50_000_000;
          default:
            return true;
        }
      })();

      return matchesKeyword && matchesDifficulty && matchesBudget;
    });
  }, [initialScenarios, search, difficulty, budgetFilter]);

  const sortedScenarios = useMemo(() => {
    return [...filteredScenarios].sort((a, b) => {
      const [key, order] = sortBy.split('-');
      const direction = order === 'asc' ? 1 : -1;

      switch (key) {
        case 'title':
          return a.title.localeCompare(b.title) * direction;
        case 'totalBudget':
          return (a.totalBudget - b.totalBudget) * direction;
        case 'totalDays':
          return (a.totalDays - b.totalDays) * direction;
        default:
          return 0;
      }
    });
  }, [filteredScenarios, sortBy]);

  const handlePageChange = (page: number) => {
    router.push(`/scenario?page=${page}`);
  };

  const resetFilters = () => {
    setSearch('');
    setBudgetFilter('모든 예산');
    setDifficulty('모든 난이도');
    setSortBy('title-asc');
  };

  // Pagination Logic for generating page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <main className="mx-auto flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 text-white shadow-xl">
            <div className="absolute right-10 top-10 hidden h-48 w-48 rounded-full bg-indigo-500/30 blur-3xl md:block" />
            <div className="relative grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-200">
                  <Sparkles className="h-4 w-4" />
                  Scenario Intelligence
                </div>
                <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                  사건별 맞춤 전략을 빠르게 수립하고,
                  <span className="text-indigo-200"> 가장 적합한 대응 계획</span>을 제안받으세요.
                </h1>
                <p className="mt-3 text-sm text-indigo-100 md:text-base">
                  AI가 정리한 핵심 요약 위주로 기업 조사부터 민감한 개인 사건까지,
                  데이터 기반 의사결정을 지원합니다.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/simulation"
                    className="lira-button lira-button--blue w-full justify-center bg-white/15 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
                  >
                    실시간 시뮬레이션 시작하기
                  </Link>
                  <Link
                    href="/investigators"
                    className="lira-button lira-button--ghost w-full justify-center border border-white/30 text-sm text-white hover:bg-white/10"
                  >
                    인증된 탐정 살펴보기
                  </Link>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  icon={TrendingUp}
                  value={`${totalCount}건`}
                  label="가용 시나리오"
                  caption="주요 카테고리별 전략을 큐레이션했습니다."
                />
                <MetricCard
                  icon={Clock}
                  value="실시간"
                  label="단계별 가이드"
                  caption="성공적인 결과를 위한 최적의 일정을 제안합니다."
                />
                <MetricCard
                  icon={Shield}
                  value="데이터 기반"
                  label="합리적 예산"
                  caption="사건별 표준화된 예산 범위를 제공합니다."
                />
                <MetricCard
                  icon={Sparkles}
                  value="AI 분석"
                  label="리스크 대응"
                  caption="전문가가 설계한 단계별 대응 전략."
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">필터 & 정렬</h2>
                <p className="mt-1 text-sm text-slate-500">
                  필요한 조건을 선택하면 맞춤형 시나리오를 바로 확인할 수 있어요.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-medium text-slate-700">시나리오 검색</span>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    id="scenario-search"
                    name="q"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="제목이나 키워드 검색"
                    aria-label="시나리오 검색"
                    className="w-full h-12 rounded-full border border-slate-200 px-12 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </label>
              <Select value={budgetFilter} onChange={setBudgetFilter} label="예산 범위">
                <option>모든 예산</option>
                <option>1,000만원 이하</option>
                <option>1,000만원 - 5,000만원</option>
                <option>5,000만원 이상</option>
              </Select>
              <Select value={difficulty} onChange={setDifficulty} label="난이도">
                <option>모든 난이도</option>
                <option>쉬움</option>
                <option>중간</option>
                <option>어려움</option>
              </Select>
              <Select value={sortBy} onChange={setSortBy} label="정렬">
                <option value="title-asc">이름 (가나다순)</option>
                <option value="title-desc">이름 (역순)</option>
                <option value="totalBudget-asc">예산 (낮은순)</option>
                <option value="totalBudget-desc">예산 (높은순)</option>
                <option value="totalDays-asc">기간 (짧은순)</option>
                <option value="totalDays-desc">기간 (긴순)</option>
              </Select>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-slate-100/70 p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-slate-500">
                <ListFilter className="h-4 w-4" />
                현재 페이지에서 <strong className="text-slate-700">{filteredScenarios.length}</strong>개의 시나리오를 찾았습니다.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white"
              >
                <X className="h-3.5 w-3.5" /> 필터 초기화
              </button>
            </div>
          </section>

          {/* All scenarios with Pagination */}
          <section className="space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">시나리오 탐색</h2>
                <p className="text-sm text-slate-500">총 {totalCount}개의 사례가 준비되어 있습니다.</p>
              </div>
              <p className="text-xs font-medium text-slate-400">페이지 {currentPage} / {totalPages || 1}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sortedScenarios.length ? (
                sortedScenarios.map((scenario) => {
                  const tone = difficultyTone[scenario.difficulty as keyof typeof difficultyTone] ?? difficultyTone.default;
                  return (
                    <div
                      key={scenario.id}
                      className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className={`inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium ${tone.pill}`}>
                            {scenario.difficulty}
                          </span>
                          <span>예상 {scenario.totalDays}일</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{scenario.title}</h3>
                        <p className="line-clamp-2 text-sm text-slate-600">{scenario.description}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">{formatBudget(scenario.totalBudget)}</span>
                        <Link
                          href={`/scenarios/${scenario.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-500"
                        >
                          시뮬레이션하기 <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-slate-500">
                  데이터가 없거나 필터 조건에 맞는 결과가 없습니다.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-20 transition-all border border-slate-200 bg-white/50 shadow-sm"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-20 transition-all border border-slate-200 bg-white/50 shadow-sm"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex gap-1 px-2">
                  {getPageNumbers().map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                        currentPage === pageNum
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                          : "hover:bg-white text-slate-600 border border-slate-200 bg-white/50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-20 transition-all border border-slate-200 bg-white/50 shadow-sm"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg hover:bg-white disabled:opacity-20 transition-all border border-slate-200 bg-white/50 shadow-sm"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
};

function Select({ value, onChange, label, children }: SelectProps) {
  return (
    <label className="flex flex-col gap-2 text-sm text-slate-600">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-full border border-slate-200 px-4 text-sm text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {children}
      </select>
    </label>
  );
}

type MetricCardProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string;
  label: string;
  caption: string;
};

function MetricCard({ icon: Icon, value, label, caption }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center gap-3 text-sm font-semibold text-indigo-100">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <Icon className="h-5 w-5" />
        </span>
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-indigo-100/80">{caption}</p>
    </div>
  );
}
