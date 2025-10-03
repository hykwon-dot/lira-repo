'use client';

import React, { useState } from 'react';
import { useSimulationContext } from './SimulationContext';
import { CheckCircle, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { toggleTaskStatus } from './actions';
import type { Task } from '@prisma/client';

const TaskPanel = () => {
  const { tasks, updateTask, logEvent, currentPhase } = useSimulationContext();
  const [expanded, setExpanded] = useState(true);

  if (!tasks) {
    return <div>Loading tasks...</div>;
  }

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    
    const updatedTask = { ...task, status: newStatus };
    updateTask(updatedTask);

    try {
      await toggleTaskStatus(task.id, newStatus);
      await logEvent({
        eventType: 'TASK_STATUS_CHANGED',
        taskId: task.id,
        phaseId: currentPhase?.id ?? null,
        payload: {
          taskName: task.desc,
          status: newStatus,
        },
      });
    } catch (error) {
      console.error("Failed to update task status:", error);
      updateTask(task); 
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg backdrop-blur-sm">
      <button
        className="w-full flex justify-between items-center p-4 text-white"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-bold text-lg">Phase Tasks</h3>
        {expanded ? <ChevronDown /> : <ChevronRight />}
      </button>
      {expanded && (
        <div className="p-4 border-t border-white/10">
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {tasks.map((task) => (
              <li
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className="flex items-center p-3 rounded-md cursor-pointer transition-colors bg-slate-800/50 hover:bg-slate-700/50"
              >
                {task.status === 'COMPLETED' ? (
                  <CheckCircle className="w-5 h-5 mr-3 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 mr-3 text-slate-500" />
                )}
                <span className={`flex-grow ${task.status === 'COMPLETED' ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                  {task.desc}
                </span>
                <span className="text-xs text-slate-400">{task.durationDays} days</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TaskPanel;
