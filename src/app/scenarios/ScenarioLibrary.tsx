"use client";

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/userStore';
import { ScenarioSummary } from '@/app/scenarios/types';

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
    const router = useRouter();
    const { user } = useUserStore();
    const [activeTab, setActiveTab] = useState('전체');

    useEffect(() => {
        if (!user) {
            router.replace('/login?redirect=/scenarios');
        }
    }, [user, router]);

    const industries = useMemo(() => {
        const unique = new Set<string>();
        scenarios.forEach((scenario) => {
            unique.add(scenario.industry || '기타');
        });
        return ['전체', ...Array.from(unique)];
    }, [scenarios]);

    const filteredScenarios = useMemo(() => {
        if (activeTab === '전체') {
            return scenarios;
        }
        return scenarios.filter((scenario) => (scenario.industry || '기타') === activeTab);
    }, [activeTab, scenarios]);

    if (!user) {
        return null; // Redirecting...
    }

    if (!scenarios || scenarios.length === 0) {
        return <p className="text-center text-slate-500 mt-10">사용 가능한 시나리오가 없습니다.</p>;
    }

    return (
        <div className="bg-slate-50">
            <div className="container mx-auto">
                <div className="text-center mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">분야별 시나리오</h2>
                    <p className="text-sm md:text-base text-slate-600">관심 있는 산업 분야를 선택하여 확인해보세요.</p>
                </div>

                <div className="mb-8 md:mb-10 overflow-x-auto -mx-4 px-4 md:overflow-visible md:mx-0 md:px-0 md:text-center no-scrollbar pb-2 md:pb-0">
                    <div className="inline-flex items-center gap-2 bg-slate-200 p-1.5 rounded-full whitespace-nowrap">
                        {industries.map((industry) => (
                            <button
                                key={industry}
                                onClick={() => setActiveTab(industry)}
                                className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${activeTab === industry ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-300/50'}`}
                            >
                                {industry}
                            </button>
                        ))}
                    </div>
                </div>

                <AnimatePresence>
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredScenarios.map((scenario) => (
                            <ScenarioCard key={scenario.id} scenario={scenario} />
                        ))}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
