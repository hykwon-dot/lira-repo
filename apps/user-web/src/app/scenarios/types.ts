export interface ScenarioPhaseSummary {
  id: string;
  name: string;
  durationDays?: number;
  details: string[];
}

export interface ScenarioSummary {
  id: string;
  title: string;
  industry: string;
  description: string;
  difficulty?: string;
  totalDurationDays?: number;
  budgetRecommended?: number;
  successRate?: number;
  phases: ScenarioPhaseSummary[];
}
