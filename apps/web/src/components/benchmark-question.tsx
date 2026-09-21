import { CheckCircle2, CircleX } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import type { BenchmarkResult, MMLUProRow } from "@/lib/benchmark";

interface BenchmarkQuestionProps {
  index: number;
  result?: BenchmarkResult;
  row: MMLUProRow;
}

export function BenchmarkQuestion({ index, result, row }: BenchmarkQuestionProps) {
  const { t } = useI18n();

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>#{index + 1}</span>
          <span>{row.category}</span>
          <span>{row.src}</span>
        </div>
        {result ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium ${
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

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{row.question}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {row.options.map((option, optionIndex) => {
          const code = String.fromCharCode(65 + optionIndex);
          const isExpected = code === row.answer;
          const isPredicted = code === result?.predicted;
          return (
            <div
              key={`${code}-${option}`}
              className={`rounded-md border px-3 py-2 text-xs leading-5 ${
                isPredicted
                  ? "bg-signal/10 border-signal text-foreground"
                  : isExpected && result
                    ? "border-destructive/40 bg-destructive/5 text-foreground"
                    : "border-border bg-background text-muted-foreground"
              }`}
            >
              <span className="mr-2 font-mono text-signal">{code}</span>
              {option}
            </div>
          );
        })}
      </div>
      {result ? (
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          {t("benchmark.expected", { value: result.expected })} ·{" "}
          {t("benchmark.predicted", { value: result.predicted ?? "—" })}
          {result.confidence === null
            ? ""
            : ` · ${t("benchmark.confidence", { value: (result.confidence * 100).toFixed(1) })}`}
        </p>
      ) : null}
    </article>
  );
}
