"use client";

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowRight, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { ScenarioSummary } from '@/app/scenarios/types';
import { useUserStore } from '@/lib/userStore';

interface ScenarioCardProps {
    scenario: ScenarioSummary;
}

const formatSuccessRate = (value?: number) => {
    if (typeof value !== 'number') return null;
    if (value > 1) {
        return `${value.toFixed(0)}%`;
    }
    return `${Math.round(value * 100)}%`;
};

const ScenarioCard = ({ scenario }: ScenarioCardProps) => {
    const meta = useMemo(() => {
        const items: string[] = [];
        if (scenario.totalDurationDays) {
            items.push(`예상 ${scenario.totalDurationDays}일`);
        }
        if (scenario.budgetRecommended) {
            items.push(`권장 예산 ${scenario.budgetRecommended.toLocaleString()}원`);
        }
        const successRate = formatSuccessRate(scenario.successRate);
        if (successRate) {
            items.push(`성공률 ${successRate}`);
        }
        if (scenario.difficulty) {
            items.push(`난이도 ${scenario.difficulty}`);
        }
        return items.join(' · ');
    }, [scenario]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out overflow-hidden border border-slate-200/60 group"
        >
            <Link href={`/scenarios/${scenario.id}`}>
                <div className="p-6 h-full cursor-pointer flex flex-col">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-blue-100 rounded-full mr-4">
                            <Briefcase className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm font-semibold text-blue-700 bg-blue-100 py-1 px-3 rounded-full">
                            {scenario.industry}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{scenario.title}</h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-3 flex-1">{scenario.description}</p>
                    {meta ? <p className="text-xs font-medium text-slate-400 mb-6">{meta}</p> : null}
                    <div className="mt-auto pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center text-blue-600 font-semibold group-hover:text-blue-800 transition-colors duration-300">
                            <span>사건 사례 자세히 보기</span>
                            <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
};

interface ScenarioLibraryProps {
    scenarios: ScenarioSummary[];
}

export default function ScenarioLibrary({ scenarios }: ScenarioLibraryProps) {
    const [activeTab, setActiveTab] = useState('전체');
    const [currentPage, setCurrentPage] = useState(1);
    const { user } = useUserStore();
    const isLoggedIn = !!user;
    
    const ITEMS_PER_PAGE = 9;

    const industries = useMemo(() => {
        const unique = new Set<string>();
        scenarios.forEach((scenario) => {
            unique.add(scenario.industry || '기타');
        });
        return ['전체', ...Array.from(unique)];
    }, [scenarios]);

    const filteredScenarios = useMemo(() => {
        let result = scenarios;
        if (activeTab !== '전체') {
            result = scenarios.filter((scenario) => (scenario.industry || '기타') === activeTab);
        }
        return result;
    }, [activeTab, scenarios]);

    const handleTabChange = (industry: string) => {
        setActiveTab(industry);
        setCurrentPage(1);
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredScenarios.length / ITEMS_PER_PAGE);
    const currentScenarios = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredScenarios.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredScenarios, currentPage]);

    if (!scenarios || scenarios.length === 0) {
        return <p className="text-center text-slate-500 mt-10">사용 가능한 시나리오가 없습니다.</p>;
    }

    return (
        <div className="max-w-7xl mx-auto px-4">
            {/* Filter Tabs */}
            <div className="flex justify-center mb-10">
                <div className="flex flex-wrap items-center gap-2 bg-slate-200 p-1.5 rounded-2xl md:rounded-full justify-center">
                    {industries.map((industry) => (
                        <button
                            key={industry}
                            onClick={() => handleTabChange(industry)}
                            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${activeTab === industry ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
                        >
                            {industry}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scenario Grid with Gating Logic */}
            <div className="relative min-h-[400px]">
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500 ${!isLoggedIn ? 'blur-md pointer-events-none select-none grayscale-[0.5]' : ''}`}>
                    <AnimatePresence mode="wait">
                        {currentScenarios.map((scenario) => (
                            <ScenarioCard key={scenario.id} scenario={scenario} />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Pagination Controls (Hidden when blurred for better UI) */}
                {isLoggedIn && totalPages > 1 && (
                    <div className="mt-16 flex justify-center items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowRight size={20} className="rotate-180" />
                        </button>
                        
                        <div className="flex items-center gap-1 mx-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                                        currentPage === page
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                            : 'text-slate-500 hover:bg-slate-100'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}

                {/* Login Overlay */}
                {!isLoggedIn && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
                        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl border border-white p-8 rounded-[2.5rem] shadow-2xl text-center animate-in fade-in zoom-in duration-500">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-6 shadow-inner">
                                <Lock size={32} />
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 mb-3 leading-tight">
                                상세 사례는 로그인 후<br/>확인하실 수 있습니다
                            </h2>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                LIRA 파트너들이 해결한 실제 성공 사례와<br/>
                                단계별 조사 과정을 확인하고 최적의 솔루션을 찾으세요.
                            </p>
                            <Link 
                                href={`/login?redirect=${encodeURIComponent('/scenarios')}`}
                                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98]"
                            >
                                <LogIn size={20} />
                                로그인하고 계속하기
                            </Link>
                            <p className="mt-4 text-sm text-slate-400">
                                아직 계정이 없으신가요? <Link href="/register" className="text-blue-600 font-bold hover:underline">회원가입</Link>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
