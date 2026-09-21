import { CheckCircle2, CircleX } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import type { BenchmarkResult, BenchmarkRow } from "@/lib/benchmark";

interface BenchmarkResultsTableProps {
  results: Record<string, BenchmarkResult>;
  rows: BenchmarkRow[];
}

function codeFor(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatPercent(value: number): string {
  const probability = Math.min(1, Math.max(0, value));
  return `${(probability * 100).toFixed(probability >= 0.995 || probability <= 0.005 ? 0 : 1)}%`;
}

function highestProbability(result: BenchmarkResult | undefined): number | null {
  const values = result ? Object.values(result.probabilities) : [];
  return values.length > 0 ? Math.max(...values) : null;
}

export function BenchmarkResultsTable({ results, rows }: BenchmarkResultsTableProps) {
  const { t } = useI18n();
  const optionCount = Math.max(0, ...rows.map((row) => row.options.length));

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1100px] table-fixed border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th className="w-[34rem] border-b border-border px-3 py-3 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("benchmark.question")}
            </th>
            <th className="w-24 border-b border-l border-border px-3 py-3 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("benchmark.result")}
            </th>
            {Array.from({ length: optionCount }, (_, index) => (
              <th
                key={index}
                className="w-40 border-b border-l border-border px-3 py-3 text-center font-mono text-[11px] text-muted-foreground"
              >
                {codeFor(index)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const result = results[row.key];
            const highest = highestProbability(result);
            return (
              <tr key={row.key}>
                <td className="border-b border-border px-3 py-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      #{rowIndex + 1}
                    </span>
                    <span className="min-w-0 truncate text-xs text-foreground" title={row.question}>
                      {row.question}
                    </span>
                    <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground xl:inline">
                      {row.category}
                    </span>
                  </div>
                </td>
                <td className="border-b border-l border-border px-3 py-2">
                  <div className="flex justify-center">
                    {result ? (
                      result.correct ? (
                        <CheckCircle2 className="size-4 text-signal" />
                      ) : (
                        <CircleX className="size-4 text-destructive" />
                      )
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                {Array.from({ length: optionCount }, (_, optionIndex) => {
                  const code = codeFor(optionIndex);
                  const option = row.options[optionIndex];
                  const probability = result?.probabilities[code];
                  const width =
                    probability === undefined ? 0 : Math.min(100, Math.max(0, probability * 100));
                  const isExpected = code === row.answer;
                  const isPredicted = code === result?.predicted;
                  const isCorrectPick = Boolean(result?.correct && isExpected && isPredicted);
                  const isHighest = probability !== undefined && probability === highest;
                  const borderClass = isCorrectPick
                    ? "ring-2 ring-inset ring-signal"
                    : isPredicted
                      ? "ring-2 ring-inset ring-destructive"
                      : isExpected && result
                        ? "ring-2 ring-inset ring-signal"
                        : "";
                  return (
                    <td
                      key={code}
                      className="h-11 border-b border-l border-border p-0"
                      title={option}
                    >
                      <div
                        className={`relative flex h-11 items-center justify-center overflow-hidden ${borderClass}`}
                        role="progressbar"
                        aria-label={`${code}: ${probability === undefined ? "—" : formatPercent(probability)}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(width)}
                      >
                        <div
                          aria-hidden="true"
                          className={`absolute inset-y-0 left-0 transition-[width] duration-500 ${
                            isHighest ? "bg-signal" : "bg-signal opacity-30"
                          }`}
                          style={{ width: `${width}%` }}
                        />
                        <span
                          className={`relative font-mono text-[11px] ${
                            isHighest ? "font-semibold text-signal-foreground" : "text-foreground"
                          }`}
                        >
                          {probability === undefined ? "—" : formatPercent(probability)}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
