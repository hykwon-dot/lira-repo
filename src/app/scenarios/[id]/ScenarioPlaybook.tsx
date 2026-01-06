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
            <FiChevronRight className="mx-1 md:mx-2 shrink-0" />
            <span className="font-semibold text-gray-700 truncate">{scenario.title}</span>
          </div>
          <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-12 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
                <h1 className="text-2xl md:text-5xl font-extrabold text-gray-800 mb-2 md:mb-4">{scenario.title}</h1>
                <p className="text-sm md:text-lg text-gray-600 max-w-3xl">{scenario.description}</p>
             </div>
             <button
                onClick={handleStartSimulation}
                disabled={!selectedPhaseId}
                className="w-full md:w-auto flex items-center justify-center bg-blue-600 text-white font-bold py-3 md:py-4 px-6 md:px-8 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform md:hover:scale-105 active:scale-95"
              >
                <FiPlayCircle className="mr-2 md:mr-3 h-5 w-5 md:h-6 md:w-6" />
                <span className="text-base md:text-lg">시뮬레이션 시작</span>
              </button>
          </div>
        </div>
      </header>

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
