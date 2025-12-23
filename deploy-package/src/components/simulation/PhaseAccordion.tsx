"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown, ChevronRight, Clock, DollarSign, Archive,
    List, TrendingUp, AlertTriangle
} from 'lucide-react';
import React from 'react';

// Interfaces matching the dynamically generated scenario data
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

const AccordionSection = ({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => (
    <div className="pt-4 mt-4 border-t border-gray-200 first:mt-0 first:pt-0 first:border-none">
        <h4 className="flex items-center text-md font-semibold text-gray-700 mb-3">
            <Icon className="h-5 w-5 mr-2 text-gray-500" />
            {title}
        </h4>
        <div className="pl-7 text-gray-600 text-sm">
            {children}
        </div>
    </div>
);

const RiskSeverityBadge = ({ severity }: { severity: string }) => {
    const style = {
        'H': 'bg-red-100 text-red-800',
        'M': 'bg-yellow-100 text-yellow-800',
        'L': 'bg-green-100 text-green-800',
    }[severity] || 'bg-gray-100 text-gray-800';

    const label = {
        'H': '높음',
        'M': '중간',
        'L': '낮음',
    }[severity] || severity;

    return (
        <span className={`ml-2 text-xs font-bold px-2 py-1 rounded-full ${style}`}>
            심각도: {label}
        </span>
    );
};

export const PhaseAccordion = ({ phase }: { phase: Phase }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Helper to format budget string
  const formatBudget = (budget: string | undefined) => {
    if (!budget) return 'N/A';
    const num = parseInt(budget.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num)) return budget;
    return `${(num / 10000).toLocaleString()}만원`;
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 focus:outline-none"
      >
        <div className="flex items-center">
          <span className={`mr-4 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}>
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </span>
          <span className="font-bold text-lg text-gray-800">{phase.name}</span>
        </div>
        <div className="flex items-center space-x-6">
            <div className="text-right">
                <p className="text-sm text-gray-500 flex items-center"><Clock className="h-4 w-4 mr-1 inline"/>기간</p>
                <p className="font-semibold text-gray-700">{phase.durationDays ? `${phase.durationDays}일` : 'N/A'}</p>
            </div>
            <div className="text-right">
                <p className="text-sm text-gray-500 flex items-center"><DollarSign className="h-4 w-4 mr-1 inline"/>예산</p>
                <p className="font-semibold text-gray-700">{formatBudget(phase.budget)}</p>
            </div>
            {isOpen ? <ChevronDown className="h-6 w-6 text-gray-500" /> : <ChevronRight className="h-6 w-6 text-gray-500" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="p-5 bg-white"
          >
            <p className="text-gray-600 mb-6 text-sm">{phase.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {phase.tasks && phase.tasks.length > 0 && (
                    <AccordionSection title="주요 업무" icon={List}>
                        <ul className="list-disc list-inside space-y-1">
                            {phase.tasks.map((task, i) => <li key={i}>{task.desc}</li>)}
                        </ul>
                    </AccordionSection>
                )}

                {phase.phaseKPI && phase.phaseKPI.length > 0 && (
                    <AccordionSection title="핵심 성과 지표" icon={TrendingUp}>
                        <ul className="list-disc list-inside space-y-1">
                            {phase.phaseKPI.map((kpi, i) => <li key={i}>{kpi}</li>)}
                        </ul>
                    </AccordionSection>
                )}

                {phase.deliverables && phase.deliverables.length > 0 && (
                    <AccordionSection title="산출물" icon={Archive}>
                        <ul className="list-disc list-inside space-y-1">
                            {phase.deliverables.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                    </AccordionSection>
                )}

                {phase.risks && phase.risks.length > 0 && (
                    <AccordionSection title="리스크" icon={AlertTriangle}>
                        <ul className="space-y-2">
                            {phase.risks.map((risk, i) => (
                                <li key={i} className="p-2 bg-gray-50 rounded-md">
                                    <span className="font-semibold">{risk.name}</span>
                                    <RiskSeverityBadge severity={risk.severity} />
                                    <p className="text-xs text-gray-500 mt-1">완화 방안: {risk.mitigation}</p>
                                </li>
                            ))}
                        </ul>
                    </AccordionSection>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
