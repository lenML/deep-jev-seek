import { CheckCircle2, ChevronDown, CircleX } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n/use-i18n";
import type { BenchmarkResult, MMLUProRow } from "@/lib/benchmark";

interface BenchmarkQuestionProps {
  index: number;
  result?: BenchmarkResult;
  row: MMLUProRow;
}

function formatPercent(value: number): string {
  const probability = Math.min(1, Math.max(0, value));
  return `${(probability * 100).toFixed(probability >= 0.995 || probability <= 0.005 ? 0 : 1)}%`;
}

export function BenchmarkQuestion({ index, result, row }: BenchmarkQuestionProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-lg border border-border bg-card p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="shrink-0">#{index + 1}</span>
          <span className="truncate">{row.category}</span>
          <span className="hidden truncate lg:inline">{row.src}</span>
        </div>
        {result ? (
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${
              result.correct
                ? "border-signal/40 bg-signal/10 text-signal"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {result.correct ? <CheckCircle2 className="size-3" /> : <CircleX className="size-3" />}
            {result.correct ? t("benchmark.correct") : t("benchmark.incorrect")}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        aria-label={`${t(expanded ? "benchmark.collapse" : "benchmark.expand")} #${index + 1}`}
        onClick={() => setExpanded((current) => !current)}
        className="group mt-3 flex w-full items-start gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={`min-w-0 flex-1 text-sm leading-6 text-foreground ${
            expanded ? "whitespace-pre-wrap" : "block truncate"
          }`}
        >
          {row.question}
        </span>
        <ChevronDown
          className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:text-foreground ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className="mt-4 space-y-2">
        {row.options.map((option, optionIndex) => {
          const code = String.fromCharCode(65 + optionIndex);
          const isExpected = code === row.answer;
          const isPredicted = code === result?.predicted;
          const probability = result?.probabilities[code];
          const width =
            probability === undefined ? 0 : Math.min(100, Math.max(0, probability * 100));

          return (
            <div
              key={`${code}-${option}`}
              className={`relative overflow-hidden rounded-md border ${
                isPredicted
                  ? "border-signal/70"
                  : isExpected && result
                    ? "border-destructive/50"
                    : "border-border"
              }`}
            >
              <div
                aria-hidden="true"
                className="bg-signal/20 absolute inset-y-0 left-0 transition-[width] duration-500"
                style={{ width: `${width}%` }}
              />
              <div className="relative flex min-w-0 items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`shrink-0 font-mono text-[11px] ${
                      isPredicted ? "text-signal" : "text-muted-foreground"
                    }`}
                  >
                    {code}
                  </span>
                  <span
                    className={`min-w-0 text-xs leading-5 ${
                      expanded ? "" : "block truncate"
                    } ${isPredicted ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {option}
                  </span>
                  {isPredicted ? <CheckCircle2 className="size-3 shrink-0 text-signal" /> : null}
                </div>
                <span
                  className={`w-14 shrink-0 text-right font-mono text-[11px] ${
                    isPredicted ? "text-signal" : "text-muted-foreground"
                  }`}
                >
                  {probability === undefined ? "—" : formatPercent(probability)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {result ? (
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4 font-mono text-[10px] text-muted-foreground">
          <p>
            {t("benchmark.expected", { value: result.expected })} ·{" "}
            {t("benchmark.predicted", { value: result.predicted ?? "—" })}
            {result.confidence === null
              ? ""
              : ` · ${t("benchmark.confidence", { value: (result.confidence * 100).toFixed(1) })}`}
          </p>
          {result.durationMs === null ? null : (
            <span className="text-signal">
              {t("benchmark.questionDuration", { value: result.durationMs })}
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}
