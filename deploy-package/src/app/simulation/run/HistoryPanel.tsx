"use client";

import React, { useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { useSimulationStore } from '@/lib/simulationStore';
import { AnimatePresence, motion } from 'framer-motion';
import { useSimulationContext } from './SimulationContext';

const HistoryPanel = () => {
  const { history } = useSimulationStore();
  const { logEvent, runId } = useSimulationContext();
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!note.trim() || !runId) {
      return;
    }
    setIsSubmitting(true);
    try {
      await logEvent({
        eventType: 'NOTE_ADDED',
        payload: { note: note.trim() },
      });
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-6 backdrop-blur-sm h-full flex flex-col">
      <h3 className="font-bold text-lg text-white mb-4 flex items-center flex-shrink-0">
        <FiClock className="mr-3 text-slate-400" />
        시나리오 히스토리
      </h3>
      <form onSubmit={handleAddNote} className="mb-4 flex flex-col gap-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="중요한 메모를 기록해 보세요"
          rows={2}
          className="bg-slate-800/80 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          disabled={!runId || isSubmitting}
        />
        <button
          type="submit"
          disabled={!runId || isSubmitting || !note.trim()}
          className="self-end px-4 py-2 text-xs font-semibold rounded-md bg-sky-500 text-white hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          기록 추가
        </button>
      </form>
      <div className="overflow-y-auto flex-grow -mr-6 pr-6">
        {history.length === 0 ? (
          <div className="text-slate-400 text-sm h-full flex items-center justify-center">
            <p>아직 히스토리가 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {history.map((entry) => (
                <motion.li 
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  className="text-sm text-slate-400 flex items-start"
                >
                  <span className="text-slate-500 mr-3 font-mono text-xs">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                  <span className="flex-1">{entry.text}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
