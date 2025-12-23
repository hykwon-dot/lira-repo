"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { PhaseAccordion } from './PhaseAccordion';

// Interfaces matching the backend Zod schema
interface Task {
  desc: string;
}

interface Risk {
  name: string;
  severity: string;
  mitigation: string;
}

interface Phase {
  name: string;
  description: string;
  durationDays?: number;
  budget?: string;
  deliverables?: string[];
  tasks?: Task[];
  phaseKPI?: string[];
  risks?: Risk[];
}

interface GeneratedScenario {
  title?: string;
  description?: string;
  phases?: Phase[];
}

// 로딩 상태를 표시하는 컴포넌트
interface LoadingProgress {
  stage: string;
  percentage: number;
}

const LoadingIndicator = ({ progress }: { progress: LoadingProgress }) => {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-md text-gray-700">{progress.stage}</h3>
        <span className="text-sm font-medium text-gray-500">{Math.round(progress.percentage)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <motion.div
          className="bg-blue-600 h-2.5 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

export const GeneratedScenarioCard = ({ 
  scenario, 
  isLoading, 
  loadingProgress 
}: { 
  scenario: GeneratedScenario | null, 
  isLoading: boolean, 
  loadingProgress: LoadingProgress 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (isLoading) {
    return (
      <motion.div layout className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <LoadingIndicator progress={loadingProgress} />
      </motion.div>
    );
  }

  if (!scenario || !scenario.title) return null;

  return (
    <motion.div layout className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4 text-left border-b border-gray-200"
      >
        <h3 className="font-bold text-lg text-gray-800">실시간 분석</h3>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{scenario.title}</h2>
              <p className="text-gray-600 mb-6">{scenario.description}</p>

              <div className="space-y-3">
                {scenario.phases?.map((phase, index) => (
                  <PhaseAccordion key={index} phase={phase} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
