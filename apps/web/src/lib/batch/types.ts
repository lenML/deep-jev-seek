export type BatchRowStatus = "idle" | "running" | "done" | "error";

export interface BatchColumn {
  id: string;
  text: string;
}

export interface BatchCell {
  probability: number | null;
}

export interface BatchRow {
  id: string;
  prompt: string;
  cells: BatchCell[];
  status: BatchRowStatus;
  error: string | null;
  durationMs: number | null;
}

export interface BatchData {
  columns: BatchColumn[];
  rows: BatchRow[];
}

export interface BatchRunUpdate {
  status: BatchRowStatus;
  cells: BatchCell[];
  error: string | null;
  durationMs: number | null;
}
