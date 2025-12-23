import { create } from 'zustand';

export interface HistoryEntry {
  id: string;
  text: string;
  timestamp: string;
  eventType?: string;
}

interface SimulationState {
  runId: number | null;
  completedTasks: Set<number>;
  history: HistoryEntry[];
  setRunId: (runId: number | null) => void;
  setHistory: (entries: HistoryEntry[]) => void;
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => void;
  markTaskCompletion: (taskId: number, completed: boolean) => void;
  setCompletedTasks: (taskIds: number[]) => void;
  isTaskCompleted: (taskId: number) => boolean;
  reset: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  runId: null,
  completedTasks: new Set<number>(),
  history: [],
  setRunId: (runId: number | null) => set({ runId }),
  setHistory: (entries: HistoryEntry[]) =>
    set(() => ({
      history: entries,
    })),
  addHistoryEntry: ({ id, text, eventType, timestamp }) =>
    set((state) => ({
      history: [
        {
          id: id ?? crypto.randomUUID(),
          text,
          eventType,
          timestamp: timestamp ?? new Date().toISOString(),
        },
        ...state.history,
      ],
    })),
  markTaskCompletion: (taskId: number, completed: boolean) =>
    set((state) => {
      const updated = new Set(state.completedTasks);
      if (completed) {
        updated.add(taskId);
      } else {
        updated.delete(taskId);
      }
      return { completedTasks: updated };
    }),
  setCompletedTasks: (taskIds: number[]) =>
    set(() => ({
      completedTasks: new Set(taskIds),
    })),
  isTaskCompleted: (taskId: number) => {
    return get().completedTasks.has(taskId);
  },
  reset: () => set({ runId: null, completedTasks: new Set<number>(), history: [] }),
}));
