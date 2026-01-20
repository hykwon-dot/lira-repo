export interface InvestigationChecklistPhase {
  id: number;
  label: string;
  status: 'pending' | 'in_progress' | 'completed';
  description: string;
  keyPoints: string[];
}

export interface IntakeSummary {
  caseTitle: string;
  caseType: string;
  primaryIntent: string;
  urgency: string;
  objective: string;
  // keyFacts deprecated in favor of checklist logic, but kept for compatibility
  keyFacts?: string[]; 
  missingDetails: string[];
  recommendedDocuments?: string[];
  nextQuestions: string[];
  
  // New Checklist System
  investigationChecklist?: InvestigationChecklistPhase[];
  currentPhase?: number;
  nextActionSuggestion?: 'continue_interview' | 'suggest_hiring';
}
