
export interface AnalysisResult {
  relevancyScore: number;
  recommendation: 'HIRE' | 'CONSIDER' | 'DO NOT HIRE';
  summary: string;
  pros: string[];
  cons: string[];
  finalVerdict: string;
  interviewQuestions: string[];
}