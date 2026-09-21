import { indexToChoiceCode, mapWithConcurrency, type ChoiceQuestion } from "@lenml/jevseek";

import { runJevSeek } from "@/lib/run";

import type { BatchColumn, BatchRow, BatchRunUpdate } from "./types";

const BATCH_CONCURRENCY = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildInstructions(commonPrefix: string, prompt: string): string {
  const prefix = commonPrefix.trim();
  const body = prompt.trim();
  return prefix ? `${prefix}\n\n${body}` : body;
}

function activeColumns(columns: BatchColumn[]) {
  return columns.flatMap((column, index) =>
    column.text.trim() ? [{ column, index, code: indexToChoiceCode(index) }] : [],
  );
}

async function runRow(input: {
  connection: Parameters<typeof runJevSeek>[0]["connection"];
  columns: BatchColumn[];
  commonPrefix: string;
  row: BatchRow;
}): Promise<BatchRunUpdate> {
  const active = activeColumns(input.columns);
  if (!input.row.prompt.trim() || active.length === 0) {
    return {
      status: "error",
      cells: input.columns.map(() => ({ probability: null })),
      error: "Prompt and at least one option are required.",
      durationMs: null,
    };
  }

  const question: ChoiceQuestion = {
    type: "choice",
    instructions: buildInstructions(input.commonPrefix, input.row.prompt),
    criteria: Object.fromEntries(active.map(({ column, code }) => [code, column.text.trim()])),
  };

  try {
    const output = await runJevSeek({
      connection: input.connection,
      state: {},
      questions: { [input.row.id]: question },
    });
    const answer = output.result.answers[input.row.id];
    if (answer?.type !== "choice") {
      throw new Error("Batch question did not return a choice answer.");
    }

    const probabilities = new Map(
      active.map(({ code }) => [code, answer.probabilities[code] ?? 0]),
    );
    return {
      status: "done",
      cells: input.columns.map((column, index) => ({
        probability: column.text.trim() ? (probabilities.get(indexToChoiceCode(index)) ?? 0) : null,
      })),
      error: null,
      durationMs:
        output.result.diagnostics?.questions[input.row.id]?.durationMs ?? output.latencyMs,
    };
  } catch (error) {
    return {
      status: "error",
      cells: input.columns.map(() => ({ probability: null })),
      error: errorMessage(error),
      durationMs: null,
    };
  }
}

export async function runBatchRows(input: {
  connection: Parameters<typeof runJevSeek>[0]["connection"];
  columns: BatchColumn[];
  commonPrefix: string;
  rows: BatchRow[];
}): Promise<Record<string, BatchRunUpdate>> {
  const updates = await mapWithConcurrency(input.rows, BATCH_CONCURRENCY, (row) =>
    runRow({
      columns: input.columns,
      connection: input.connection,
      commonPrefix: input.commonPrefix,
      row,
    }),
  );
  return Object.fromEntries(input.rows.map((row, index) => [row.id, updates[index]!]));
}
