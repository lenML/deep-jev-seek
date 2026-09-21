import { parseDataRecords } from "@/lib/benchmark/parser";
import { normalizeOptions } from "@/lib/benchmark/options";

import type { BatchOption, BatchRow } from "./types";

export const DEFAULT_OPTION_COLUMNS = 5;

let batchSequence = 0;

function nextBatchId() {
  batchSequence += 1;
  const random = globalThis.crypto?.randomUUID?.();
  return random ? `batch-${random}` : `batch-${Date.now()}-${batchSequence}`;
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

function emptyOption(): BatchOption {
  return { text: "", code: null, probability: null };
}

export function createEmptyBatchRow(columnCount = DEFAULT_OPTION_COLUMNS): BatchRow {
  return {
    id: nextBatchId(),
    prompt: "",
    options: Array.from({ length: columnCount }, emptyOption),
    status: "idle",
    error: null,
    durationMs: null,
  };
}

export function resizeBatchRows(rows: BatchRow[], columnCount: number): BatchRow[] {
  return rows.map((row) => ({
    ...row,
    options: Array.from({ length: columnCount }, (_, index) => row.options[index] ?? emptyOption()),
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

  return positionalOptions(record);
}

export function parseBatchText(text: string): BatchRow[] {
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

  const optionCount = Math.max(
    DEFAULT_OPTION_COLUMNS,
    ...parsed.map((item) => item.options.length),
  );
  return parsed.map((item) => ({
    id: nextBatchId(),
    prompt: item.prompt,
    options: Array.from({ length: optionCount }, (_, index) => ({
      text: item.options[index] ?? "",
      code: null,
      probability: null,
    })),
    status: "idle",
    error: null,
    durationMs: null,
  }));
}
