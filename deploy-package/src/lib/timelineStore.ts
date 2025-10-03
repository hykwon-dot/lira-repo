import { create } from 'zustand';

export type TimelineStatus = 'pending' | 'in-progress' | 'completed';

export interface TimelineEntry {
  id: string;
  label: string;
  description?: string | null;
  source: 'fact' | 'missing' | 'document' | 'question' | 'manual';
  status: TimelineStatus;
  notes?: string;
  createdAt: string;
}

interface TimelineState {
  timelines: Record<string, TimelineEntry[]>;
  initializeTimeline: (key: string, entries: TimelineEntry[]) => void;
  updateStatus: (key: string, entryId: string, status: TimelineStatus) => void;
  updateNotes: (key: string, entryId: string, notes: string) => void;
  addEntry: (key: string, entry: TimelineEntry) => void;
}

const sortEntries = (entries: TimelineEntry[]) => {
  const order: Record<TimelineStatus, number> = {
    completed: 2,
    'in-progress': 1,
    pending: 0,
  };
  return [...entries].sort((a, b) => order[b.status] - order[a.status] || a.createdAt.localeCompare(b.createdAt));
};

export const useTimelineStore = create<TimelineState>((set) => ({
  timelines: {},
  initializeTimeline: (key, entries) =>
    set((state) => {
      const next = sortEntries(entries);
      // 기존 데이터가 있고 수동으로 추가한 항목을 보존하기 위해 병합
      const existing = state.timelines[key];
      if (existing) {
        const preservedManual = existing.filter((entry) => entry.source === 'manual');
        const merged = sortEntries([...next, ...preservedManual]);
        return {
          timelines: {
            ...state.timelines,
            [key]: merged,
          },
        };
      }
      return {
        timelines: {
          ...state.timelines,
          [key]: next,
        },
      };
    }),
  updateStatus: (key, entryId, status) =>
    set((state) => {
      const target = state.timelines[key];
      if (!target) return state;
      const updated = target.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status,
            }
          : entry,
      );
      return {
        timelines: {
          ...state.timelines,
          [key]: sortEntries(updated),
        },
      };
    }),
  updateNotes: (key, entryId, notes) =>
    set((state) => {
      const target = state.timelines[key];
      if (!target) return state;
      return {
        timelines: {
          ...state.timelines,
          [key]: target.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  notes,
                }
              : entry,
          ),
        },
      };
    }),
  addEntry: (key, entry) =>
    set((state) => {
      const current = state.timelines[key] ?? [];
      return {
        timelines: {
          ...state.timelines,
          [key]: sortEntries([...current, entry]),
        },
      };
    }),
}));
