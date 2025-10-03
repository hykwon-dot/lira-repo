"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiLink, FiCopy } from 'react-icons/fi';

interface SimilarScenario {
  id: string;
  title: string;
  summary: string;
}

export const SimilarScenariosCard = ({ scenarios }: { scenarios: SimilarScenario[] }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (scenarios.length === 0) {
    return null; // Don't render the card if there are no scenarios
  }

  return (
    <motion.div layout className="bg-slate-800/50 rounded-lg border border-slate-700 mt-4 backdrop-blur-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div className="flex items-center">
          <FiCopy className="mr-3 text-slate-400" />
          <h3 className="font-bold text-lg text-slate-100">유사 시나리오 추천</h3>
        </div>
        {isExpanded ? <FiChevronUp className="text-slate-400" /> : <FiChevronDown className="text-slate-400" />}
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: { duration: 0.3 } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-slate-700">
              <ul className="space-y-2">
                {scenarios.map(s => (
                  <li key={s.id} className="bg-slate-900/70 p-3 rounded-md hover:bg-slate-800 transition-colors duration-200 border border-slate-800">
                    <p className="font-semibold text-sm text-blue-400">{s.title}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.summary}</p>
                    <a href={`/scenarios/${s.id}`} className="text-xs text-sky-400 hover:underline mt-2 inline-flex items-center">
                      <FiLink className="mr-1" />
                      자세히 보기
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
