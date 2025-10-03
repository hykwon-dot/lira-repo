"use client";

import React from 'react';
import { useSimulationContext } from './SimulationContext';
import { FiBox, FiChevronRight } from 'react-icons/fi';
import { Phase } from '@prisma/client';

const Sidebar = () => {
  const { scenario, currentPhase, setCurrentPhaseId, loading } = useSimulationContext();

  if (loading && !scenario) { // 초기 로딩 시에만 전체 로더 표시
    return <aside className="w-64 md:w-72 bg-gray-800 border-r border-gray-700 p-4 md:p-6 flex items-center justify-center"><p className="text-gray-400">시나리오 로딩 중...</p></aside>;
  }

  if (!scenario) {
    return <aside className="w-64 md:w-72 bg-gray-800 border-r border-gray-700 p-4 md:p-6"></aside>;
  }

  const handlePhaseClick = (phase: Phase) => {
    void setCurrentPhaseId(phase.id.toString(), { log: true, phaseName: phase.name });
  };

  return (
    <aside className="w-64 md:w-72 bg-gray-800 border-r border-gray-700 p-4 md:p-6 flex flex-col">
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg font-bold text-white flex items-center">
          <FiBox className="mr-3 text-sky-400"/>
          {scenario.title}
        </h2>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{scenario.description}</p>
      </div>
      
      <h3 className="font-semibold text-sm text-gray-400 mb-3 uppercase tracking-wider">Phases</h3>
      <nav className="flex-grow">
        <ul className="space-y-1.5">
          {scenario.phases.map((phase: Phase, index: number) => {
            const isActive = phase.id === currentPhase?.id;
            return (
              <li key={phase.id}>
                <button 
                  onClick={() => handlePhaseClick(phase)}
                  disabled={loading} // 단계 변경 중 비활성화
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors duration-200 text-sm font-medium text-left ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'} ${loading ? 'cursor-not-allowed' : ''}`}>
                  <div className="flex items-center">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${isActive ? 'bg-sky-400 text-gray-900' : 'bg-gray-700 text-gray-300'}`}>{index + 1}</span>
                    <span>{phase.name}</span>
                  </div>
                  {isActive && !loading && <FiChevronRight className="w-5 h-5" />}
                  {loading && isActive && <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
