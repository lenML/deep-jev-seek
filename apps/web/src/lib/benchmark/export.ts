import type { BenchmarkResult, BenchmarkRow } from "./types";

interface BenchmarkExportInput {
  taskName: string;
  modelName: string;
  rows: BenchmarkRow[];
  results: Record<string, BenchmarkResult>;
}

interface CompletedBenchmarkRow {
  row: BenchmarkRow;
  result: BenchmarkResult;
}

function completedRows(input: BenchmarkExportInput): CompletedBenchmarkRow[] {
  return input.rows.flatMap((row) => {
    const result = input.results[row.key];
    return result ? [{ row, result }] : [];
  });
}

function safeFilePart(value: string): string {
  const safe = value
    .normalize("NFKC")
    .trim()
    .replace(/[<>:"/\\|?*]/gu, "-")
    .replace(/\p{Cc}/gu, "-")
    .replace(/\s+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^[._-]+|[._-]+$/gu, "");
  return safe || "benchmark";
}

function exportFilename(input: BenchmarkExportInput, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${safeFilePart(input.taskName)}_${safeFilePart(input.modelName)}_${date}.${extension}`;
}

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function probabilityValue(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}

export function downloadBenchmarkJson(input: BenchmarkExportInput) {
  const completed = completedRows(input);
  const correct = completed.filter(({ result }) => result.correct).length;
  const payload = {
    task: input.taskName,
    model: input.modelName,
    exportedAt: new Date().toISOString(),
    total: completed.length,
    correct,
    accuracy: completed.length === 0 ? null : correct / completed.length,
    results: completed.map(({ row, result }) => ({
      id: row.id,
      category: row.category,
      source: row.src,
      question: row.question,
      options: Object.fromEntries(
        row.options.map((option, index) => [String.fromCharCode(65 + index), option]),
      ),
      expected: result.expected,
      predicted: result.predicted,
      correct: result.correct,
      confidence: result.confidence,
      durationMs: result.durationMs,
      probabilities: result.probabilities,
    })),
  };

  downloadFile(
    exportFilename(input, "json"),
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8",
  );
}

export function downloadBenchmarkCsv(input: BenchmarkExportInput) {
  const completed = completedRows(input);
  const optionCount = Math.max(0, ...completed.map(({ row }) => row.options.length));
  const optionHeaders = Array.from({ length: optionCount }, (_, index) => {
    const code = String.fromCharCode(65 + index);
    return `${code}_probability`;
  });
  const header = [
    "task",
    "model",
    "id",
    "category",
    "source",
    "question",
    "expected",
    "predicted",
    "correct",
    "confidence",
    "duration_ms",
    ...optionHeaders,
  ];
  const rows = completed.map(({ row, result }) => [
    input.taskName,
    input.modelName,
    row.id,
    row.category,
    row.src,
    row.question,
    result.expected,
    result.predicted ?? "",
    result.correct,
    result.confidence ?? "",
    result.durationMs ?? "",
    ...Array.from({ length: optionCount }, (_, index) =>
      probabilityValue(result.probabilities[String.fromCharCode(65 + index)]),
    ),
  ]);
  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");

  downloadFile(exportFilename(input, "csv"), `\uFEFF${csv}`, "text/csv;charset=utf-8");
}
