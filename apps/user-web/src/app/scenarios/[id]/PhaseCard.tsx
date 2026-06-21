'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiCheckCircle, FiAlertTriangle, FiTarget, FiTrendingUp, FiList, FiFileText } from 'react-icons/fi';
import type { PhaseWithDetails } from './types';
import React from 'react';

interface PhaseCardProps {
  phase: PhaseWithDetails;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

interface SectionProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const getIcon = (title: string) => {
    if (title.includes('요구')) return <FiList className="text-blue-500" />;
    if (title.includes('성공')) return <FiCheckCircle className="text-green-500" />;
    if (title.includes('산출물')) return <FiFileText className="text-indigo-500" />;
    if (title.includes('조심')) return <FiAlertTriangle className="text-yellow-500" />;
    if (title.includes('리스크')) return <FiTrendingUp className="text-red-500" />;
    return <FiTarget className="text-purple-500" />;
};

const Section = ({ title, icon, children }: SectionProps) => (
  <div className="border-t border-gray-200 py-4">
    <h4 className="text-md font-semibold text-gray-700 flex items-center mb-2">
      {icon}
      <span className="ml-2">{title}</span>
    </h4>
    <div className="text-sm text-gray-600 pl-6 space-y-1">
      {children}
    </div>
  </div>
);

export function PhaseCard({ phase, index, isSelected, onSelect, isOpen, onToggleOpen }: PhaseCardProps) {

  return (
    <div className={`bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 ${isSelected ? 'border-blue-500 shadow-blue-200' : 'border-gray-100'}`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-semibold text-blue-600">Phase {index + 1}</p>
              <h3 className="text-xl font-bold text-gray-800 mt-1">{phase.name}</h3>
            </div>
            <button 
              onClick={onSelect}
              className={`px-4 py-2 text-sm font-bold rounded-full border-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50'}`}>
              {isSelected ? '✓ 선택됨' : '선택'}
            </button>
        </div>
        <p className="text-sm text-gray-600 mb-4 h-16 overflow-hidden">{phase.description}</p>
        <button
          onClick={onToggleOpen}
          className="w-full text-left flex justify-between items-center text-sm text-gray-500 hover:text-gray-800"
        >
          <span>상세 정보 {isOpen ? '닫기' : '보기'}</span>
          {isOpen ? <FiChevronUp /> : <FiChevronDown />}
        </button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-gray-200"
          >
            <div className="px-6 pb-6 pt-4">
              <Section title="요구 업무" icon={getIcon('요구')}>
                {phase.tasks && phase.tasks.length > 0 ? (
                  phase.tasks.map(task => <p key={task.id}>- {task.desc}</p>)
                ) : (
                  <p className="text-gray-500">- 등록된 업무가 없습니다.</p>
                )}
              </Section>

              <Section title="성공 판단 기준" icon={getIcon('성공')}>
                 {phase.phaseKPI && Array.isArray(phase.phaseKPI) && phase.phaseKPI.length > 0 ? (
                   phase.phaseKPI.map((kpi, i) => {
                     if (typeof kpi === 'string') {
                       return <p key={i}>- {kpi}</p>;
                     }
                     return null;
                   })
                 ) : (
                  <p className="text-gray-500">- 등록된 성공 기준이 없습니다.</p>
                 )}
              </Section>

              <Section title="산출물 (Deliverables)" icon={getIcon('산출물')}>
                {phase.deliverables && Array.isArray(phase.deliverables) && phase.deliverables.length > 0 ? (
                  phase.deliverables.map((d, i) => {
                      if (typeof d === 'string') return <p key={i}>- 📄 {d}</p>;
                      return null;
                  })
                ) : (
                  <p className="text-gray-500">- 등록된 산출물이 없습니다.</p>
                )}
              </Section>

              <Section title="리스크 헷지" icon={getIcon('리스크')}>
                {phase.risks && phase.risks.length > 0 ? (
                  phase.risks.map(risk => <p key={risk.id}>- {risk.name}: {risk.mitigation}</p>)
                ) : (
                  <p className="text-gray-500">- 등록된 리스크가 없습니다.</p>
                )}
              </Section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
