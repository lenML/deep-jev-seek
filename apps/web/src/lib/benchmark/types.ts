import type { ChoiceQuestion } from "@lenml/jevseek";

export interface BenchmarkSource {
  id: string;
  name: string;
  url: string;
  kind: "builtin" | "custom";
}

export interface BenchmarkRow {
  key: string;
  id: string;
  state: unknown;
  question: string;
  instructions: ChoiceQuestion;
  options: string[];
  answer: string;
  answerIndex: number;
  category: string;
  src: string;
}

export interface BenchmarkDataset {
  source: BenchmarkSource;
  rows: BenchmarkRow[];
  total: number;
}

export interface BenchmarkResult {
  predicted: string | null;
  expected: string;
  correct: boolean;
  confidence: number | null;
  probabilities: Record<string, number>;
  durationMs: number | null;
}
