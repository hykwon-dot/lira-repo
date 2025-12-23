"use client";

import React, { useState, useEffect } from 'react';
import { useSimulationContext } from './SimulationContext';
import { AlertTriangle } from 'lucide-react';
import type { TooltipProps } from 'recharts';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RiskPanel: React.FC = () => {
  const { tasks, currentPhase } = useSimulationContext();
  const [riskHistory, setRiskHistory] = useState<{ name: string, variance: number }[]>([]);

  useEffect(() => {
    if (!tasks || !currentPhase) return;

    const phaseDuration = currentPhase.tasks.reduce((sum, task) => sum + (task.durationDays || 0), 0);
    const elapsedDays = tasks
      .filter(task => task.status === 'COMPLETED')
      .reduce((sum, task) => sum + (task.durationDays || 0), 0);

    const completedTaskDuration = elapsedDays;
    const totalTaskDuration = phaseDuration;

    const scheduleAdherence = totalTaskDuration > 0 ? (completedTaskDuration / totalTaskDuration) * 100 : 0;
    const expectedCompletionRate = phaseDuration > 0 ? Math.min((elapsedDays / phaseDuration) * 100, 100) : 0;
    const scheduleVariance = scheduleAdherence - expectedCompletionRate;

    setRiskHistory(prevHistory => {
        const newPoint = { name: `#${prevHistory.length + 1}`, variance: scheduleVariance };
        if (prevHistory.length === 0 || prevHistory[prevHistory.length - 1].variance.toFixed(1) !== scheduleVariance.toFixed(1)) {
            return [...prevHistory, newPoint];
        }
        return prevHistory;
    });

  }, [tasks, currentPhase]);

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const value = payload[0]?.value;
    const variance = typeof value === 'number' ? value : Number(value ?? 0);

    return (
      <div className="p-3 bg-gray-800/90 border border-gray-700 rounded-lg shadow-xl text-sm">
        <p className="label text-white font-bold mb-2">{`Update ${label ?? ''}`}</p>
        <p className={variance < 0 ? "text-red-400" : "text-green-400"}>
          {`일정 편차: ${variance.toFixed(1)}%`}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {variance < -10 ? '심각한 지연' : variance < 0 ? '지연' : variance > 10 ? '매우 순조로움' : '순조로움'}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm h-full flex flex-col">
      <h3 className="font-bold text-lg text-white mb-4 flex items-center">
        <AlertTriangle className="mr-2 text-yellow-400" />
        Risk Trend
      </h3>
      <div className="flex-grow" style={{ width: '100%', minHeight: '150px' }}>
        {riskHistory.length > 0 ? (
            <ResponsiveContainer>
                <AreaChart data={riskHistory} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <defs>
                        <linearGradient id="colorVariance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.7)" fontSize={10} />
                    <YAxis stroke="rgba(255, 255, 255, 0.7)" fontSize={10} tickFormatter={(tick) => `${tick}%`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
                    <Area type="monotone" dataKey="variance" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorVariance)" />
                </AreaChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                태스크를 완료하여 리스크 트렌드를 확인하세요.
            </div>
        )}
      </div>
    </div>
  );
};

export default RiskPanel;
