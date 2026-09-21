export type BatchRowStatus = "idle" | "running" | "done" | "error";

export interface BatchOption {
  text: string;
  code: string | null;
  probability: number | null;
}

export interface BatchRow {
  id: string;
  prompt: string;
  options: BatchOption[];
  status: BatchRowStatus;
  error: string | null;
  durationMs: number | null;
}

export interface BatchRunUpdate {
  status: BatchRowStatus;
  options: BatchOption[];
  error: string | null;
  durationMs: number | null;
}
