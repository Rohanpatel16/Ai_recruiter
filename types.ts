
export interface AnalysisResult {
  relevancyScore: number;
  recommendation: 'Strong Hire' | 'Consider' | 'Reject';
  summary: string;
  pros: string[];
  cons: string[];
  redFlags: string[];
  finalVerdict: string;
  interviewQuestions: string[];
}