'use client';

import React from 'react';
import type { TooltipProps } from 'recharts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSimulationContext } from './SimulationContext';

const ProgressChart: React.FC = () => {
  const { tasks, currentPhase } = useSimulationContext();

  const phaseDuration = currentPhase?.tasks.reduce((sum, task) => sum + (task.durationDays || 0), 0) ?? 0;
  const elapsedDays = tasks
    .filter(task => task.status === 'COMPLETED')
    .reduce((sum, task) => sum + (task.durationDays || 0), 0);

  const totalTaskDuration = tasks.reduce((sum, task) => sum + (task.durationDays || 0), 0);
  const completedTaskDuration = tasks
    .filter(task => task.status === 'COMPLETED')
    .reduce((sum, task) => sum + (task.durationDays || 0), 0);

  const actualProgress = totalTaskDuration > 0 ? (completedTaskDuration / totalTaskDuration) * 100 : 0;
  const expectedProgress = phaseDuration > 0 ? Math.min((elapsedDays / phaseDuration) * 100, 100) : 0;

  const data = [
    {
      name: '진행률',
      '실제 진행률': actualProgress,
      '예상 진행률': expectedProgress,
    },
  ];

  const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length < 2) {
      return null;
    }

    const actualValue = typeof payload[0].value === 'number' ? payload[0].value : Number(payload[0].value ?? 0);
    const expectedValue = typeof payload[1].value === 'number' ? payload[1].value : Number(payload[1].value ?? 0);

    return (
      <div className="p-3 bg-gray-800/90 border border-gray-700 rounded-lg shadow-xl text-sm">
        <p className="label text-white font-bold mb-2">{`${label ?? ''}`}</p>
        <p className="text-sky-400">{`실제: ${actualValue.toFixed(1)}%`}</p>
        <p className="text-amber-400">{`예상: ${expectedValue.toFixed(1)}%`}</p>
      </div>
    );
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 backdrop-blur-sm h-full flex flex-col">
      <h3 className="font-bold text-lg text-white mb-4">진행률 현황 (Actual vs Expected)</h3>
      <div className="flex-grow" style={{ width: '100%', minHeight: '150px' }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} stroke="rgba(255, 255, 255, 0.7)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="rgba(255, 255, 255, 0.7)" fontSize={12} width={50} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />
            <Bar dataKey="실제 진행률" fill="#38bdf8" barSize={15} radius={[0, 8, 8, 0]} background={{ fill: 'rgba(255, 255, 255, 0.08)', radius: 8 }} />
            <Bar dataKey="예상 진행률" fill="#f59e0b" barSize={15} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProgressChart;
