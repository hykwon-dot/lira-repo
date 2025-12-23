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
    <div className="bg-gray-50 min-h-screen font-sans p-8">
      {/* 상단 헤더 */}
      <header className="mb-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center text-sm text-gray-500 mb-4">
            <FiHome className="mr-2" />
            <Link href="/">Home</Link>
            <FiChevronRight className="mx-2" />
            <Link href="/scenario">시나리오 라이브러리</Link>
            <FiChevronRight className="mx-2" />
            <span className="font-semibold text-gray-700">{scenario.title}</span>
          </div>
          <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-12 overflow-hidden flex justify-between items-center">
             <div>
                <h1 className="text-5xl font-extrabold text-gray-800 mb-4">{scenario.title}</h1>
                <p className="text-lg text-gray-600 max-w-3xl">{scenario.description}</p>
             </div>
             <button
                onClick={handleStartSimulation}
                disabled={!selectedPhaseId}
                className="flex items-center bg-blue-600 text-white font-bold py-4 px-8 rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
              >
                <FiPlayCircle className="mr-3 h-6 w-6" />
                <span className="text-lg">선택 단계부터 시뮬레이션 시작</span>
              </button>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-7xl mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">시작할 단계를 선택하세요</h2>
          <p className="text-gray-500">아래 단계 중 하나를 선택하여 시뮬레이션을 시작할 수 있습니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
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
