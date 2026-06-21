"use client";

import { FiArrowRight, FiHelpCircle, FiSearch, FiBox } from 'react-icons/fi';
import { SimilarScenariosCard } from './SimilarScenariosCard'; 
import { motion } from 'framer-motion';

interface NextActionPanelProps {
  recommendedQuestions?: string[];
  similarScenarios?: Array<{ id: string; title: string; summary: string; }>;
  onQuestionClick: (question: string) => void;
  isLoading: boolean;
}

const PanelCard = ({ children, title, icon: Icon }: { children: React.ReactNode, title: string, icon: React.ElementType }) => (
    <motion.div 
        className="bg-white border border-slate-200 rounded-xl shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
    >
        <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center">
                <Icon className="w-5 h-5 mr-3 text-blue-500" />
                {title}
            </h2>
        </div>
        <div className="p-4">
            {children}
        </div>
    </motion.div>
);


export const NextActionPanel = ({ recommendedQuestions, similarScenarios, onQuestionClick, isLoading }: NextActionPanelProps) => {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800">다음 단계 제안</h1>
        <p className="text-sm text-slate-500">AI 추천 질문과 유사 시나리오를 탐색하세요.</p>
      </div>
      <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-6">
        
        <PanelCard title="추천 질문" icon={FiHelpCircle}>
            <div className="space-y-2">
                {isLoading && !recommendedQuestions ? (
                    <p className="text-sm text-slate-500">분석 중...</p>
                ) : recommendedQuestions && recommendedQuestions.length > 0 ? (
                recommendedQuestions.map((q, i) => (
                    <button
                    key={i}
                    onClick={() => onQuestionClick(q)}
                    className="w-full text-left p-3 bg-slate-50 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors flex justify-between items-center group"
                    >
                    <span className="text-sm text-slate-700 group-hover:text-blue-800">{q}</span>
                    <FiArrowRight className="text-slate-400 group-hover:text-blue-600 transition-transform transform group-hover:translate-x-1" />
                    </button>
                ))
                ) : (
                <p className="text-sm text-slate-500">대화를 시작하면 추천 질문이 생성됩니다.</p>
                )}
            </div>
        </PanelCard>

        <PanelCard title="유사 시나리오" icon={FiSearch}>
             {isLoading && !similarScenarios ? (
                <p className="text-sm text-slate-500">분석 중...</p>
            ) : similarScenarios && similarScenarios.length > 0 ? (
                <SimilarScenariosCard scenarios={similarScenarios} />
            ) : (
                 <div className="text-center py-4">
                    <FiBox className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">관련 시나리오가 없습니다.</p>
                </div>
            )}
        </PanelCard>
      </div>
    </div>
  );
};
