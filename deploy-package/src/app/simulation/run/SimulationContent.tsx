'use client';

import React from 'react';
import { useSimulationContext } from './SimulationContext';
import TaskPanel from './TaskPanel';
import { Loader2 } from 'lucide-react';

const SimulationContent = () => {
  const { currentPhase, loading } = useSimulationContext();

  if (loading) {
    return (
        <div className="bg-gray-800/50 rounded-lg p-6 h-full flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin h-12 w-12 mb-4" />
            <p className="text-lg">페이즈 데이터를 불러오는 중...</p>
        </div>
    );
  }

  if (!currentPhase) {
    return <div className="bg-gray-800/50 rounded-lg p-6 h-full flex items-center justify-center text-white">페이즈를 선택해주세요.</div>;
  }

  return (
    <div className="h-full">
      <TaskPanel />
    </div>
  );
};

export default SimulationContent;
