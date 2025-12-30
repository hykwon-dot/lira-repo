'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  getScenario,
  getPhaseDetails,
  ScenarioWithPhases,
  PhaseWithTasks,
  Task,
} from './actions';
import { useSimulationStore } from '@/lib/simulationStore';
import { useUserStore } from '@/lib/userStore';

type SimulationEventType = 'PHASE_ENTERED' | 'TASK_STATUS_CHANGED' | 'NOTE_ADDED';

type LogEventInput = {
  eventType: SimulationEventType;
  payload?: Record<string, unknown> | null;
  phaseId?: number | null;
  taskId?: number | null;
  runStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  metadata?: Record<string, unknown> | null;
  completedAt?: string | null;
};

interface SimulationState {
  scenario: ScenarioWithPhases | null;
  currentPhase: PhaseWithTasks | null;
  tasks: Task[];
  updateTask: (updatedTask: Task) => void;
  setCurrentPhaseId: (phaseId: string, options?: { log?: boolean; phaseName?: string }) => Promise<void>;
  logEvent: (input: LogEventInput, options?: { skipPhaseReload?: boolean }) => Promise<void>;
  runId: number | null;
  loading: boolean;
}

const SimulationContext = createContext<SimulationState | undefined>(undefined);

const buildHistoryText = (event: unknown): string => {
  const eventRecord = (typeof event === 'object' && event !== null ? event : {}) as Record<string, unknown>;
  const payloadValue = eventRecord.payload;
  const payload =
    typeof payloadValue === 'object' && payloadValue !== null
      ? (payloadValue as Record<string, unknown>)
      : {};
  const eventType = typeof eventRecord.eventType === 'string' ? eventRecord.eventType : undefined;

  switch (eventType) {
    case 'PHASE_ENTERED': {
      const phaseName = typeof payload.phaseName === 'string' ? payload.phaseName : undefined;
      return phaseName ? `페이즈 "${phaseName}"로 이동했습니다.` : '새 페이즈로 이동했습니다.';
    }
    case 'TASK_STATUS_CHANGED': {
      const taskName = typeof payload.taskName === 'string' ? payload.taskName : undefined;
      const status = typeof payload.status === 'string' ? payload.status : undefined;
      if (taskName && status) {
        const statusText = status === 'COMPLETED' ? '완료' : '업데이트';
        return `과업 "${taskName}" 상태가 ${statusText}되었습니다.`;
      }
      return '과업 상태가 변경되었습니다.';
    }
    case 'NOTE_ADDED': {
      const note = typeof payload.note === 'string' ? payload.note : undefined;
      return note ? `메모 기록: ${note}` : '새 메모가 추가되었습니다.';
    }
    default:
      return '시뮬레이션 이벤트가 기록되었습니다.';
  }
};

export const SimulationProvider = ({
  children,
  scenarioId,
  initialPhaseId,
}: {
  children: ReactNode;
  scenarioId: string;
  initialPhaseId: string;
}) => {
  const token = useUserStore((state) => state.token);
  
  const storeSetRunId = useSimulationStore((state) => state.setRunId);
  const setHistory = useSimulationStore((state) => state.setHistory);
  const addHistoryEntry = useSimulationStore((state) => state.addHistoryEntry);
  const setCompletedTasks = useSimulationStore((state) => state.setCompletedTasks);
  const markTaskCompletion = useSimulationStore((state) => state.markTaskCompletion);
  const reset = useSimulationStore((state) => state.reset);

  const [scenario, setScenario] = useState<ScenarioWithPhases | null>(null);
  const [currentPhase, setCurrentPhase] = useState<PhaseWithTasks | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [runIdState, setRunIdState] = useState<number | null>(null);
  const initializingRef = useRef(false);

  const scenarioIdNumber = Number.parseInt(scenarioId, 10);
  const initialPhaseIdNumber = Number.parseInt(initialPhaseId, 10);

  const loadData = useCallback(
    async (phaseIdToLoad: string) => {
      setLoading(true);
      try {
        let currentScenario = scenario;
        if (!currentScenario) {
          const scenarioData = await getScenario(scenarioId);
          setScenario(scenarioData);
          currentScenario = scenarioData;
        }

        // If phaseIdToLoad is a number (DB ID), try to load it directly.
        // If it fails, or if it's a small number (like 1, 2, 3) that might be an index,
        // try to find the corresponding phase in the scenario by order.
        let phaseData = await getPhaseDetails(phaseIdToLoad);
        
        if (!phaseData && currentScenario && currentScenario.phases) {
           const numericPhaseId = parseInt(phaseIdToLoad, 10);
           if (!isNaN(numericPhaseId)) {
             // Try to find by order (assuming 1-based index from URL)
             const phaseByOrder = currentScenario.phases.find(p => p.order === numericPhaseId - 1);
             if (phaseByOrder) {
               phaseData = await getPhaseDetails(phaseByOrder.id.toString());
             }
           }
        }

        setCurrentPhase(phaseData);
        if (phaseData) {
          setTasks(phaseData.tasks);
        }
      } catch (error) {
        console.error('Failed to load simulation data:', error);
      } finally {
        setLoading(false);
      }
    },
    [scenarioId, scenario],
  );

  useEffect(() => {
    reset();
    return () => {
      reset();
    };
  }, [reset, scenarioId, initialPhaseId]);

  const ensureRun = useCallback(async () => {
    if (!token) {
      return null;
    }

    let targetScenarioId = scenarioIdNumber;

    if (Number.isNaN(targetScenarioId)) {
      if (scenario) {
        targetScenarioId = scenario.id;
      } else {
        try {
          const resolvedScenario = await getScenario(scenarioId);
          if (resolvedScenario) {
            targetScenarioId = resolvedScenario.id;
            setScenario(resolvedScenario);
          } else {
            return null;
          }
        } catch (e) {
          console.error('Error resolving scenario ID:', e);
          return null;
        }
      }
    }

    if (Number.isNaN(targetScenarioId)) {
      return null;
    }

    try {
      const params = new URLSearchParams({
        scenarioId: String(targetScenarioId),
        status: 'ACTIVE',
        limit: '1',
      });
      const listResponse = await fetch(`/api/simulation/runs?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        if (Array.isArray(listData.items) && listData.items.length > 0) {
          return listData.items[0];
        }
      }

      const createPayload: Record<string, unknown> = {
        scenarioId: targetScenarioId,
      };
      if (!Number.isNaN(initialPhaseIdNumber)) {
        createPayload.currentPhaseId = initialPhaseIdNumber;
      }

      const createResponse = await fetch('/api/simulation/runs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      });

      if (!createResponse.ok) {
        console.error('Failed to create simulation run');
        return null;
      }

      const created = await createResponse.json();
      return created.run ?? null;
    } catch (error) {
      console.error('Failed to ensure simulation run:', error);
      return null;
    }
  }, [token, scenarioIdNumber, initialPhaseIdNumber, scenarioId, scenario]);

  const fetchRunDetails = useCallback(
    async (runId: number) => {
      if (!token) {
        return null;
      }
      try {
        const response = await fetch(`/api/simulation/runs/${runId}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        return data.run ?? null;
      } catch (error) {
        console.error('Failed to fetch run details:', error);
        return null;
      }
    },
    [token],
  );

  const initializeSimulation = useCallback(async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;
    setLoading(true);
    try {
      let phaseToLoad = initialPhaseId;
      const activeRun = await ensureRun();
      const runRecord =
        typeof activeRun === 'object' && activeRun !== null
          ? (activeRun as Record<string, unknown>)
          : null;

      if (runRecord) {
        const runId = typeof runRecord.id === 'number' ? runRecord.id : null;
        const currentPhaseIdValue = typeof runRecord.currentPhaseId === 'number' ? runRecord.currentPhaseId : null;

        if (runId) {
          setRunIdState(runId);
          storeSetRunId(runId);
        }

        if (currentPhaseIdValue) {
          phaseToLoad = String(currentPhaseIdValue);
        }

        const detailedRun = runId ? await fetchRunDetails(runId) : null;
        const events =
          detailedRun && Array.isArray(detailedRun.events)
            ? (detailedRun.events as Array<Record<string, unknown>>)
            : [];

        if (events.length > 0) {
          const historyEntries = events
            .map((event, index) => {
              const eventId = typeof event.id === 'number' ? String(event.id) : `local-${index}`;
              const createdAt =
                typeof event.createdAt === 'string' ? event.createdAt : new Date().toISOString();
              const eventType =
                typeof event.eventType === 'string' ? event.eventType : 'UNKNOWN_EVENT';
              return {
                id: eventId,
                text: buildHistoryText(event),
                timestamp: createdAt,
                eventType,
              };
            })
            .reverse();

          setHistory(historyEntries);

          const completedTaskIds = new Set<number>();
          for (const event of events) {
            const eventType = typeof event.eventType === 'string' ? event.eventType : null;
            const eventTaskId = typeof event.taskId === 'number' ? event.taskId : null;
            if (eventType === 'TASK_STATUS_CHANGED' && eventTaskId !== null) {
              const payload =
                typeof event.payload === 'object' && event.payload !== null
                  ? (event.payload as Record<string, unknown>)
                  : {};
              const status = typeof payload.status === 'string' ? payload.status : undefined;
              if (status === 'COMPLETED') {
                completedTaskIds.add(eventTaskId);
              } else if (status) {
                completedTaskIds.delete(eventTaskId);
              }
            }
          }
          setCompletedTasks(Array.from(completedTaskIds));
        } else {
          setHistory([]);
          setCompletedTasks([]);
        }
      } else {
        setRunIdState(null);
        storeSetRunId(null);
        setHistory([]);
        setCompletedTasks([]);
      }

      await loadData(phaseToLoad);
    } catch (error) {
      console.error('Failed to initialize simulation:', error);
    } finally {
      setLoading(false);
      initializingRef.current = false;
    }
  }, [ensureRun, fetchRunDetails, initialPhaseId, loadData, setCompletedTasks, setHistory, storeSetRunId]);

  useEffect(() => {
    void initializeSimulation();
  }, [initializeSimulation]);

  const logEventInternal = useCallback(
    async (input: LogEventInput, options?: { skipPhaseReload?: boolean }) => {
      if (!token || !runIdState) {
        return;
      }

      try {
        const response = await fetch(`/api/simulation/runs/${runIdState}/events`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        });

        if (!response.ok) {
          console.error('Failed to log simulation event');
          return;
        }

        const data = await response.json();
        const updatedRunRecord =
          typeof data.run === 'object' && data.run !== null
            ? (data.run as Record<string, unknown>)
            : null;
        const eventRecord =
          typeof data.event === 'object' && data.event !== null
            ? (data.event as Record<string, unknown>)
            : null;

        const updatedRunId =
          updatedRunRecord && typeof updatedRunRecord.id === 'number' ? updatedRunRecord.id : null;
        if (updatedRunId) {
          setRunIdState(updatedRunId);
          storeSetRunId(updatedRunId);
        }

        if (eventRecord) {
          const eventId =
            typeof eventRecord.id === 'number' ? String(eventRecord.id) : undefined;
          const eventType =
            typeof eventRecord.eventType === 'string' ? eventRecord.eventType : 'UNKNOWN_EVENT';
          const createdAt =
            typeof eventRecord.createdAt === 'string'
              ? eventRecord.createdAt
              : new Date().toISOString();

          addHistoryEntry({
            id: eventId,
            text: buildHistoryText(eventRecord),
            eventType,
            timestamp: createdAt,
          });

          if (eventType === 'TASK_STATUS_CHANGED') {
            const taskId = typeof eventRecord.taskId === 'number' ? eventRecord.taskId : null;
            const payload =
              typeof eventRecord.payload === 'object' && eventRecord.payload !== null
                ? (eventRecord.payload as Record<string, unknown>)
                : {};
            const status = typeof payload.status === 'string' ? payload.status : undefined;
            if (taskId !== null) {
              markTaskCompletion(taskId, status === 'COMPLETED');
            }
          }

          if (!options?.skipPhaseReload && eventType === 'PHASE_ENTERED') {
            const phaseId = typeof eventRecord.phaseId === 'number' ? eventRecord.phaseId : null;
            if (phaseId) {
              await loadData(String(phaseId));
            }
          }
        }
      } catch (error) {
        console.error('Failed to send simulation event:', error);
      }
    },
    [token, runIdState, addHistoryEntry, markTaskCompletion, loadData, storeSetRunId],
  );

  const setCurrentPhaseId = useCallback(
    async (phaseId: string, options?: { log?: boolean; phaseName?: string }) => {
      await loadData(phaseId);

      if (options?.log) {
        const numericPhaseId = Number.parseInt(phaseId, 10);
        if (!Number.isNaN(numericPhaseId)) {
          await logEventInternal(
            {
              eventType: 'PHASE_ENTERED',
              phaseId: numericPhaseId,
              payload: {
                phaseName: options.phaseName,
              },
            },
            { skipPhaseReload: true },
          );
        }
      }
    },
    [loadData, logEventInternal],
  );

  const updateTask = useCallback(
    (updatedTask: Task) => {
      setTasks((currentTasks) => currentTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      if (currentPhase) {
        const updatedTasksInPhase = currentPhase.tasks.map((t) =>
          t.id === updatedTask.id ? updatedTask : t,
        );
        setCurrentPhase({ ...currentPhase, tasks: updatedTasksInPhase });
      }
    },
    [currentPhase],
  );

  const contextValue = useMemo(
    () => ({
      scenario,
      currentPhase,
      tasks,
      updateTask,
      setCurrentPhaseId,
      logEvent: logEventInternal,
      runId: runIdState,
      loading,
    }),
    [scenario, currentPhase, tasks, updateTask, setCurrentPhaseId, logEventInternal, runIdState, loading],
  );

  return <SimulationContext.Provider value={contextValue}>{children}</SimulationContext.Provider>;
};

export const useSimulationContext = () => {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error('useSimulationContext must be used within a SimulationProvider');
  }
  return context;
};
