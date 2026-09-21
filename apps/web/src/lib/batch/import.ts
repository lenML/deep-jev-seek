import { normalizeOptions } from "@/lib/benchmark/options";
import { parseDataRecords } from "@/lib/benchmark/parser";

import type { BatchCell, BatchColumn, BatchData, BatchRow } from "./types";

export const DEFAULT_OPTION_LABELS = ["Negative", "Neutral", "Positive"] as const;
const DEFAULT_PROMPTS = [
  "I love this product. It works perfectly.",
  "The package arrived today.",
  "This is the worst support experience I have ever had.",
];

let batchSequence = 0;

function nextBatchId(prefix: string) {
  batchSequence += 1;
  const random = globalThis.crypto?.randomUUID?.();
  return random ? `${prefix}-${random}` : `${prefix}-${Date.now()}-${batchSequence}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringify(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return null;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function emptyCell(): BatchCell {
  return { probability: null };
}

export function createBatchColumn(text = ""): BatchColumn {
  return { id: nextBatchId("batch-column"), text };
}

export function createDefaultBatchColumns(): BatchColumn[] {
  return DEFAULT_OPTION_LABELS.map((label) => createBatchColumn(label));
}

export function createEmptyBatchRow(cellCount: number = DEFAULT_OPTION_LABELS.length): BatchRow {
  return {
    id: nextBatchId("batch-row"),
    prompt: "",
    cells: Array.from({ length: cellCount }, emptyCell),
    status: "idle",
    error: null,
    durationMs: null,
  };
}

export function createDefaultBatchRows(
  columnCount: number = DEFAULT_OPTION_LABELS.length,
): BatchRow[] {
  return DEFAULT_PROMPTS.map((prompt) => ({ ...createEmptyBatchRow(columnCount), prompt }));
}

export function createInitialBatch(): BatchData {
  const columns = createDefaultBatchColumns();
  return { columns, rows: createDefaultBatchRows(columns.length) };
}

export function resizeBatchRows(rows: BatchRow[], cellCount: number): BatchRow[] {
  return rows.map((row) => ({
    ...row,
    cells: Array.from({ length: cellCount }, (_, index) => row.cells[index] ?? emptyCell()),
  }));
}

function promptValue(record: Record<string, unknown>): string | null {
  const question = isRecord(record.question) ? record.question : null;
  if (question) {
    return stringify(question.instructions);
  }
  return stringify(
    record.prompt ?? record.question ?? record.instructions ?? record.input ?? record.text,
  );
}

function positionalOptions(record: Record<string, unknown>): string[] {
  return Object.entries(record)
    .flatMap(([key, value]) => {
      const match = /^(?:option|choice|label)[_\s-]?(\d+)$/iu.exec(key);
      return match ? [{ index: Number(match[1]), value: stringify(value) }] : [];
    })
    .filter((item): item is { index: number; value: string } => Boolean(item.value))
    .sort((left, right) => left.index - right.index)
    .map((item) => item.value);
}

const IGNORED_OPTION_FIELDS = new Set([
  "answer",
  "answer_index",
  "category",
  "context",
  "expected",
  "family",
  "group",
  "id",
  "input",
  "instructions",
  "key",
  "label",
  "prompt",
  "provenance",
  "question",
  "question_id",
  "source",
  "src",
  "state",
  "subject",
  "target",
  "text",
  "uid",
]);

function unlabeledOptionFields(record: Record<string, unknown>): string[] {
  return Object.entries(record).flatMap(([key, value]) => {
    if (IGNORED_OPTION_FIELDS.has(key.toLowerCase())) {
      return [];
    }
    if (isRecord(value) || Array.isArray(value)) {
      return [];
    }
    return [key];
  });
}

function optionValues(record: Record<string, unknown>): string[] {
  const direct = normalizeOptions(record.options ?? record.choices ?? record.labels);
  if (direct) {
    return direct.options;
  }

  const question = isRecord(record.question) ? record.question : null;
  const nested = question ? normalizeOptions(question.criteria) : null;
  if (nested) {
    return nested.options;
  }

  const positional = positionalOptions(record);
  return positional.length > 0 ? positional : unlabeledOptionFields(record);
}

export function parseBatchText(text: string): BatchData {
  const records = parseDataRecords(text);
  const parsed = records.flatMap((record) => {
    if (typeof record === "string" && record.trim()) {
      return [{ prompt: record.trim(), options: [] as string[] }];
    }
    if (!isRecord(record)) {
      return [];
    }
    const prompt = promptValue(record);
    return prompt ? [{ prompt, options: optionValues(record) }] : [];
  });
  if (parsed.length === 0) {
    throw new Error("No supported batch records found");
  }

  const importedOptionCount = Math.max(0, ...parsed.map((item) => item.options.length));
  const columnCount = importedOptionCount || DEFAULT_OPTION_LABELS.length;
  const columns = Array.from({ length: columnCount }, (_, index) => {
    const imported = parsed.find((item) => item.options[index]?.trim());
    return createBatchColumn(imported?.options[index] ?? `Option ${index + 1}`);
  });

  return {
    columns,
    rows: parsed.map((item) => ({
      id: nextBatchId("batch-row"),
      prompt: item.prompt,
      cells: Array.from({ length: columnCount }, emptyCell),
      status: "idle",
      error: null,
      durationMs: null,
    })),
  };
}
