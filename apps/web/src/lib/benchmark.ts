import { indexToChoiceCode, type ChoiceQuestion, type QuestionSet } from "@lenml/jevseek";

export const MMLU_PRO_ROWS_URL =
  "https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=validation&offset=0&length=100";

export interface MMLUProRow {
  question_id: number;
  question: string;
  options: string[];
  answer: string;
  answer_index: number;
  category: string;
  src: string;
}

export interface MMLUProDataset {
  rows: MMLUProRow[];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMMLUProRow(value: unknown): value is MMLUProRow {
  if (!isRecord(value)) {
    return false;
  }
  return (
    Number.isInteger(value.question_id) &&
    typeof value.question === "string" &&
    Array.isArray(value.options) &&
    value.options.every((option) => typeof option === "string") &&
    typeof value.answer === "string" &&
    Number.isInteger(value.answer_index) &&
    typeof value.category === "string" &&
    typeof value.src === "string"
  );
}

export async function loadMMLUProRows(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<MMLUProDataset> {
  const response = await fetchImpl(MMLU_PRO_ROWS_URL, { signal });
  if (!response.ok) {
    throw new Error(`MMLU-Pro request failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  if (!isRecord(payload) || !Array.isArray(payload.rows)) {
    throw new Error("MMLU-Pro response has no rows");
  }

  const rows = payload.rows.flatMap((item) => {
    if (!isRecord(item) || !isMMLUProRow(item.row)) {
      return [];
    }
    return [item.row];
  });
  if (rows.length === 0) {
    throw new Error("MMLU-Pro response has no valid rows");
  }

  return {
    rows,
    total: typeof payload.num_rows_total === "number" ? payload.num_rows_total : rows.length,
  };
}

export function benchmarkQuestionKey(row: MMLUProRow): string {
  return `mmlu-pro-${row.question_id}`;
}

export function buildBenchmarkQuestions(rows: MMLUProRow[]): QuestionSet {
  return Object.fromEntries(
    rows.map((row) => {
      const criteria = Object.fromEntries(
        row.options.map((option, index) => [indexToChoiceCode(index), option]),
      );
      const question: ChoiceQuestion = {
        type: "choice",
        instructions: row.question,
        criteria,
      };
      return [benchmarkQuestionKey(row), question];
    }),
  );
}

export function benchmarkResultFromAnswer(
  row: MMLUProRow,
  answer: unknown,
  durationMs?: number,
): BenchmarkResult {
  const predicted =
    isRecord(answer) && answer.type === "choice" && typeof answer.choice === "string"
      ? answer.choice
      : null;
  const confidence =
    isRecord(answer) && typeof answer.confidence === "number" ? answer.confidence : null;
  const probabilities: Record<string, number> = {};
  if (isRecord(answer) && isRecord(answer.probabilities)) {
    for (const [code, value] of Object.entries(answer.probabilities)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        probabilities[code] = value;
      }
    }
  }
  return {
    predicted,
    expected: row.answer,
    correct: predicted === row.answer,
    confidence,
    probabilities,
    durationMs: typeof durationMs === "number" ? durationMs : null,
  };
}
