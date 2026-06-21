import type { Scenario, Phase, Task, Risk } from '@prisma/client';

export type PhaseWithDetails = Phase & {
  tasks: Task[];
  risks: Risk[];
  description: string | null;
};

export type ScenarioWithDetails = Scenario & {
  phases: PhaseWithDetails[];
};
