'use client';
import React from 'react';
import { FiActivity } from 'react-icons/fi';
import { useSimulationContext } from './SimulationContext';

const Header = () => {
  const { currentPhase, scenario } = useSimulationContext();

  const title = currentPhase?.name ?? (scenario?.title || '시뮬레이션 로딩 중...');
  const description = currentPhase?.description ?? '페이즈를 선택하여 시뮬레이션을 시작하세요.';

  return (
    <header className="bg-gray-900/80 backdrop-blur-md border-b border-white/10 p-4 md:p-6 h-auto min-h-[80px] flex items-center z-10 shadow-lg">
      <div className="flex items-center">
        <FiActivity className="text-sky-400 mr-3 text-2xl" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">{title}</h1>
          {description && <p className="text-sm text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    </header>
  );
};

export default Header;
