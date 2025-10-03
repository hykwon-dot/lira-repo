export interface IntakeSummary {
  caseTitle: string;
  caseType: string;
  primaryIntent: string;
  urgency: string;
  objective: string;
  keyFacts: string[];
  missingDetails: string[];
  recommendedDocuments: string[];
  nextQuestions: string[];
}
