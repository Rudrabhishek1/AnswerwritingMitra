
export interface EvaluationConfig {
  exam: string;
  phase: string; // This internally maps to the paper type from the UI
  paper: string;
  optionalPart?: string;
  section: string;
  question: string;
  marks: number;
  wordLimit: number;
  originalPassage?: string;
}

export interface Source {
  uri: string;
  title: string;
}

export interface HistoryItem extends EvaluationConfig {
    id: string;
    answer: string;
    evaluation: string;
    sources: Source[];
    score: string;
    timestamp: number;
    modelAnswer?: string;
}