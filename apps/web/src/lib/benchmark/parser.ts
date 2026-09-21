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

function parseDelimited(text: string, delimiter: string): unknown[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index] as string;
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }
  if (rows.length < 2) {
    return [];
  }

  const headers = (rows[0] as string[]).map((header) => header.trim());
  return rows
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

  const firstLine = trimmed.split(/\r?\n/u, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  return parseDelimited(trimmed, delimiter);
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
