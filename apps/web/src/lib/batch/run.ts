import { indexToChoiceCode, mapWithConcurrency, type ChoiceQuestion } from "@lenml/jevseek";

import { runJevSeek } from "@/lib/run";

import type { BatchOption, BatchRow, BatchRunUpdate } from "./types";

const BATCH_CONCURRENCY = 4;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildInstructions(commonPrefix: string, prompt: string): string {
  const prefix = commonPrefix.trim();
  const body = prompt.trim();
  return prefix ? `${prefix}\n\n${body}` : body;
}

function activeOptions(options: BatchOption[]) {
  return options.flatMap((option, index) =>
    option.text.trim() ? [{ option, index, code: indexToChoiceCode(index) }] : [],
  );
}

async function runRow(input: {
  connection: Parameters<typeof runJevSeek>[0]["connection"];
  commonPrefix: string;
  row: BatchRow;
}): Promise<BatchRunUpdate> {
  const active = activeOptions(input.row.options);
  if (!input.row.prompt.trim() || active.length === 0) {
    return {
      status: "error",
      options: input.row.options.map((option) => ({ ...option, probability: null })),
      error: "Prompt and at least one option are required.",
      durationMs: null,
    };
  }

  const question: ChoiceQuestion = {
    type: "choice",
    instructions: buildInstructions(input.commonPrefix, input.row.prompt),
    criteria: Object.fromEntries(active.map(({ option, code }) => [code, option.text.trim()])),
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
      options: input.row.options.map((option, index) => {
        const code = indexToChoiceCode(index);
        return {
          ...option,
          code: option.text.trim() ? code : null,
          probability: option.text.trim() ? (probabilities.get(code) ?? 0) : null,
        };
      }),
      error: null,
      durationMs:
        output.result.diagnostics?.questions[input.row.id]?.durationMs ?? output.latencyMs,
    };
  } catch (error) {
    return {
      status: "error",
      options: input.row.options.map((option) => ({ ...option, probability: null })),
      error: errorMessage(error),
      durationMs: null,
    };
  }
}

export async function runBatchRows(input: {
  connection: Parameters<typeof runJevSeek>[0]["connection"];
  commonPrefix: string;
  rows: BatchRow[];
}): Promise<Record<string, BatchRunUpdate>> {
  const updates = await mapWithConcurrency(input.rows, BATCH_CONCURRENCY, (row) =>
    runRow({ connection: input.connection, commonPrefix: input.commonPrefix, row }),
  );
  return Object.fromEntries(input.rows.map((row, index) => [row.id, updates[index]!]));
}
