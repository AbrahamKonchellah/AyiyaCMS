// src/services/mlService.ts
import api from './api';

export interface ClausePrediction { label: string; probability: number }
export interface ClauseEvidence   { term: string; weight: number }

export interface AnalysedClause {
  index: number;
  text: string;
  confidence: 'high' | 'medium' | 'low';
  predictions: ClausePrediction[];   // top 3, best first
  evidence: ClauseEvidence[];        // words that pushed the model to its top answer
}

export type DateKind   = 'court_date' | 'deadline' | 'date';
export type DateStatus = 'propose' | 'needs_anchor' | 'past' | 'info' | 'unparsed';

export interface DateFinding {
  sentence: string;
  kind: DateKind;
  matchText: string;
  dateIso: string | null;
  period: { amount: number; unit: string } | null;
  anchorType: 'ruling' | 'implied' | 'other' | null;
  anchorText: string | null;
  dueDate: string | null;            // YYYY-MM-DD
  status: DateStatus;
}

export interface AnalysisResult {
  model: { name: string; classes: number };
  referenceDate: string;
  clauses: AnalysedClause[];
  dates: DateFinding[];
  elapsedMs: number;
}

const mlService = {
  analyzeText: (text: string, referenceDate?: string) =>
    api.post<AnalysisResult>('/ml/analyze-text', { text, referenceDate }).then(r => r.data),

  analyzeDocument: (documentId: string, referenceDate?: string) =>
    api.post<AnalysisResult>(`/ml/analyze-document/${documentId}`, null,
      { params: { referenceDate } }).then(r => r.data),
};

export default mlService;
