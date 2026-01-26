'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiHome, FiChevronRight, FiPlayCircle } from 'react-icons/fi';
import { PhaseCard } from './PhaseCard';
import type { ScenarioWithDetails } from './types';

interface ScenarioPlaybookProps {
  scenario: ScenarioWithDetails;
}

export default function ScenarioPlaybook({ scenario }: ScenarioPlaybookProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  const [openPhaseId, setOpenPhaseId] = useState<number | null>(null);
  const router = useRouter();

  const handleStartSimulation = () => {
    if (selectedPhaseId) {
      router.push(`/simulation/run?scenarioId=${scenario.id}&startPhaseId=${selectedPhaseId}`);
    }
  };

  const handleTogglePhase = (phaseId: number) => {
    setOpenPhaseId(prevId => (prevId === phaseId ? null : phaseId));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overview = (scenario.overview as any) || {};

  return (
    <div className="bg-gray-50 min-h-screen font-sans p-4 md:p-8">
      {/* 상단 헤더 */}
      <header className="mb-8 md:mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center text-xs md:text-sm text-gray-500 mb-4 overflow-x-hidden">
            <FiHome className="mr-1 md:mr-2 shrink-0" />
            <Link href="/" className="whitespace-nowrap">Home</Link>
            <FiChevronRight className="mx-1 md:mx-2 shrink-0" />
            <Link href="/scenarios" className="whitespace-nowrap">시나리오 라이브러리</Link>
            <FiChevronRight className="mx-1 md:mx-2 shrink-0 text-gray-400" />
            <span className="font-semibold text-gray-700 truncate">{scenario.title}</span>
          </div>
          
          <div className="relative bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100 overflow-hidden">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-4 border border-blue-100">
                      {overview.caseType || scenario.category || 'CASE REPORT'}
                    </span>
                    <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
                        {scenario.title}
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 mb-8 leading-relaxed">
                        {scenario.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-x-12 gap-y-6 pt-6 border-t border-slate-100">
                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">소요 기간</span>
                            <span className="text-xl font-bold text-slate-800">{scenario.typicalDurationDays || overview.totalDurationDays || '-'}일</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">난이도</span>
                            <span className="text-xl font-bold text-slate-800">{scenario.difficulty}</span>
                        </div>
                        <div>
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">해결 확률</span>
                            <span className="text-xl font-bold text-emerald-600">{scenario.successRate ? `${scenario.successRate}%` : 'High'}</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4">
                    <div className="text-center mb-2">
                         <h3 className="text-sm font-bold text-slate-500 uppercase">Simulation Access</h3>
                    </div>
                    <button
                        onClick={handleStartSimulation}
                        disabled={!selectedPhaseId}
                        className="w-full flex items-center justify-center bg-blue-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        <FiPlayCircle className="mr-2 h-5 w-5" />
                        <span className="text-lg">시뮬레이션 시작</span>
                    </button>
                    <p className="text-xs text-center text-slate-400 leading-relaxed">
                        * 하단의 단계(Phase) 리스트에서 시작할 지점을 선택해야 활성화됩니다.
                    </p>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Case Report Detail Section */}
      <section className="max-w-7xl mx-auto mb-16 px-4 md:px-0">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Background */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <span className="w-1.5 h-5 bg-slate-800 rounded-full mr-3"></span>
                    사건 배경 (Case Background)
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {overview.background || "상세한 배경 정보가 없습니다."}
                </p>
            </div>

            {/* Right Column: Solution & Outcome */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                        <span className="w-1.5 h-5 bg-indigo-500 rounded-full mr-3"></span>
                        해결 전략 (Key Solution)
                    </h3>
                    <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {overview.solution || "상세한 솔루션 내용이 없습니다."}
                    </p>
                </div>
                
                <div className="bg-indigo-900 rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
                    <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wide mb-2">Final Outcome</h3>
                    <p className="text-xl font-bold leading-relaxed relative z-10">
                        {overview.outcome || "성공적으로 종결되었습니다."}
                    </p>
                </div>
            </div>
         </div>
         
         {/* Investigator Note */}
         {overview.investigatorNote && (
            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-8 relative">
                <div className="absolute top-6 left-8 text-4xl text-slate-200 font-serif">❝</div>
                <div className="relative z-10 pl-8">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">from Investigator</h3>
                    <p className="text-lg font-medium text-slate-700 italic leading-relaxed">
                        {overview.investigatorNote}
                    </p>
                </div>
            </div>
         )}
      </section>

      {/* 본문 */}
      <main className="max-w-7xl mx-auto pb-10">
        <div className="mb-8 md:mb-12 text-center">
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 mb-2">시작할 단계를 선택하세요</h2>
          <p className="text-sm md:text-base text-gray-500">아래 단계 중 하나를 선택하여 시뮬레이션을 시작할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {scenario.phases.map((phase, index) => (
             <PhaseCard 
              key={phase.id} 
              phase={phase} 
              index={index} 
              isSelected={selectedPhaseId === phase.id}
              onSelect={() => setSelectedPhaseId(phase.id)}
              isOpen={openPhaseId === phase.id}
              onToggleOpen={() => handleTogglePhase(phase.id)}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
