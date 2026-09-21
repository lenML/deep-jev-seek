import Papa from "papaparse";
import { normalizeBenchmarkRecord } from "./normalize";
import type { BenchmarkDataset, BenchmarkSource } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      isRecord(item) && "row" in item ? unwrapRecords(item.row) : [item],
    );
  }
  if (!isRecord(value)) {
    return [value];
  }

  for (const key of ["rows", "data", "items", "questions", "records", "examples"]) {
    if (Array.isArray(value[key])) {
      return unwrapRecords(value[key]);
    }
  }

  const entries = Object.values(value);
  if (entries.length > 0 && entries.every(isRecord)) {
    return entries;
  }
  return [value];
}

function parseDelimited(text: string): unknown[] {
  const result = Papa.parse<string[]>(text, {
    delimiter: "",
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  const quoteError = result.errors.find((error) => error.type === "Quotes");
  if (quoteError) {
    throw new Error(
      `Invalid delimited data at row ${(quoteError.row ?? 0) + 1}: ${quoteError.message}`,
    );
  }
  if (result.data.length < 2) {
    return [];
  }

  const usedHeaders = new Map<string, number>();
  const headers = result.data[0]!.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`;
    const count = (usedHeaders.get(base) ?? 0) + 1;
    usedHeaders.set(base, count);
    return count === 1 ? base : `${base}_${count}`;
  });
  return result.data
    .slice(1)
    .map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    );
}

function parseJsonLines(text: string): unknown[] | null {
  const lines = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  try {
    return lines.map((line) => JSON.parse(line) as unknown);
  } catch {
    return null;
  }
}

export function parseDataRecords(text: string): unknown[] {
  const trimmed = text.replace(/^\uFEFF/u, "").trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const payload = JSON.parse(trimmed) as unknown;
      return unwrapRecords(payload);
    } catch {
      // Multi-line JSONL starts with `{`; fall through to line parsing.
    }
  }

  const jsonLines = parseJsonLines(trimmed);
  if (jsonLines) {
    return jsonLines;
  }

  return parseDelimited(trimmed);
}

export function parseBenchmarkDataset(text: string, source: BenchmarkSource): BenchmarkDataset {
  const records = parseDataRecords(text);
  const rows = records.flatMap((record, index) => {
    const row = normalizeBenchmarkRecord(record, source, index);
    return row ? [row] : [];
  });
  if (rows.length === 0) {
    throw new Error(`No supported benchmark records found in ${source.name}`);
  }

  return {
    source,
    rows,
    total: rows.length,
  };
}
