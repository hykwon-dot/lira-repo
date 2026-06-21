'use client';

import React, { useTransition } from 'react';
import { FiCheckCircle, FiCircle, FiClock, FiLoader } from 'react-icons/fi';
import { updateTaskStatus } from './actions';
import { useSimulationContext } from './SimulationContext';
import type { Task } from './actions';

const PriorityBadge = ({ priority }: { priority: string | null | undefined }) => {
  if (!priority) return null;

  const styles = {
    High: 'bg-red-500/20 text-red-300 border border-red-500/30',
    Medium: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    Low: 'bg-green-500/20 text-green-300 border border-green-500/30',
  };

  return (
    <span className={`text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${styles[priority as keyof typeof styles] || 'bg-gray-500/20 text-gray-300 border border-gray-500/30'}`}>
      {priority}
    </span>
  );
};


export const TaskPanelClient = () => {
  const { tasks, updateTask } = useSimulationContext();
  const [isPending, startTransition] = useTransition();

  const handleToggleTask = (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    
    startTransition(async () => {
      try {
        const updatedTask = await updateTaskStatus(task.id, newStatus);
        updateTask(updatedTask);
      } catch (error) {
        console.error("Failed to update task status:", error);
      }
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 md:p-6 h-full flex flex-col backdrop-blur-sm relative">
      <h3 className="font-bold text-lg text-white mb-4 flex-shrink-0">이번 페이즈의 과업</h3>
      {isPending && (
        <div className="absolute inset-0 bg-gray-900/60 flex items-center justify-center rounded-lg z-10">
          <FiLoader className="animate-spin text-white text-3xl" />
        </div>
      )}
      <div className="overflow-y-auto flex-grow pr-2 -mr-2">
        <ul className="space-y-3">
          {tasks.map((task) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <li 
                key={task.id} 
                className={`border border-white/10 p-4 rounded-lg flex items-start transition-all duration-200 ${isCompleted ? 'bg-green-500/10 opacity-80' : 'bg-white/5 hover:bg-white/10'} ${isPending ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !isPending && handleToggleTask(task)}
              >
                {isCompleted ? 
                  <FiCheckCircle className="text-green-400 mr-4 mt-1 flex-shrink-0 text-xl" /> : 
                  <FiCircle className="text-gray-500 mr-4 mt-1 flex-shrink-0 text-xl" />
                }
                <div className="flex-1">
                  <p className={`font-semibold text-gray-200 ${isCompleted ? 'line-through text-gray-400' : ''}`}>{task.taskKey}</p>
                  <p className="text-sm text-gray-400 mt-1">{task.desc}</p>
                  <div className="flex items-center text-xs text-gray-400 mt-3">
                    <PriorityBadge priority={task.priority} />
                    {task.durationDays != null && (
                      <span className="flex items-center">
                        <FiClock className="mr-1.5" />
                        {task.durationDays}일 소요
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
