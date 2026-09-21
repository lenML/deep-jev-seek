import { mapWithConcurrency, type QuestionSet } from "@lenml/jevseek";

import { runJevSeek } from "@/lib/run";

import type { BenchmarkResult, BenchmarkRow } from "./types";

const GROUP_CONCURRENCY = 4;

interface BenchmarkRowGroup {
  state: unknown;
  rows: BenchmarkRow[];
}

interface BenchmarkRunOutput {
  results: Record<string, BenchmarkResult>;
  latencyMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stateKey(value: unknown): string {
  if (typeof value === "string") {
    return `string:${value}`;
  }
  try {
    return `json:${JSON.stringify(value)}`;
  } catch {
    return `value:${String(value)}`;
  }
}

function groupRows(rows: BenchmarkRow[]): BenchmarkRowGroup[] {
  const groups = new Map<string, BenchmarkRowGroup>();
  for (const row of rows) {
    const key = stateKey(row.state);
    const group = groups.get(key);
    if (group) {
      group.rows.push(row);
    } else {
      groups.set(key, { state: row.state, rows: [row] });
    }
  }
  return [...groups.values()];
}

export function benchmarkQuestionKey(row: BenchmarkRow): string {
  return row.key;
}

export function buildBenchmarkQuestions(rows: BenchmarkRow[]): QuestionSet {
  return Object.fromEntries(rows.map((row) => [benchmarkQuestionKey(row), row.instructions]));
}

export function benchmarkResultFromAnswer(
  row: BenchmarkRow,
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

export async function runBenchmarkRows(input: {
  connection: Parameters<typeof runJevSeek>[0]["connection"];
  rows: BenchmarkRow[];
}): Promise<BenchmarkRunOutput> {
  const startedAt = performance.now();
  const results: Record<string, BenchmarkResult> = {};
  const groups = groupRows(input.rows);

  const outputs = await mapWithConcurrency(groups, GROUP_CONCURRENCY, async (group) => {
    const output = await runJevSeek({
      connection: input.connection,
      state: group.state,
      questions: buildBenchmarkQuestions(group.rows),
    });
    return { group, output };
  });

  for (const { group, output } of outputs) {
    const diagnostics = output.result.diagnostics?.questions;
    for (const row of group.rows) {
      const key = benchmarkQuestionKey(row);
      results[key] = benchmarkResultFromAnswer(
        row,
        output.result.answers[key],
        diagnostics?.[key]?.durationMs,
      );
    }
  }

  return {
    results,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
