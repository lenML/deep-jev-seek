import type { JevAnswer, JevSeekResponse } from "@lenml/jevseek";
import { Braces, Eye, LoaderCircle, Play } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";

import type { RawExchange } from "@/lib/types";

export type PreviewMode = "preview" | "json";

interface PlaygroundPreviewProps {
  threshold: number;
  result: JevSeekResponse | null;
  rawExchanges: RawExchange[];
  error: string | null;
  isRunning: boolean;
  mode: PreviewMode;
  latencyMs: number | null;
  onModeChange: (mode: PreviewMode) => void;
}

function percent(value: number) {
  return `${(value * 100).toFixed(value >= 0.995 || value <= 0.005 ? 0 : 1)}%`;
}

function ProbabilityBars({ probabilities }: { probabilities: Record<string, number> }) {
  return (
    <div className="space-y-4">
      {Object.entries(probabilities)
        .sort(([, left], [, right]) => right - left)
        .map(([label, value]) => (
          <div key={label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span>{label}</span>
              <span className="font-mono text-xs text-muted-foreground">{percent(value)}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div className="h-full rounded-full bg-signal" style={{ width: `${value * 100}%` }} />
            </div>
          </div>
        ))}
    </div>
  );
}

function AnswerView({ answer, threshold }: { answer: JevAnswer; threshold: number }) {
  const { t } = useI18n();

  if (answer.type === "noul") {
    const isTrue = answer.noul * 100 >= threshold;
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("preview.answer")}
          </p>
          <p className="mt-2 text-5xl font-semibold tracking-tight">
            {isTrue ? t("preview.true") : t("preview.false")}
          </p>
          <p className="mt-2 font-mono text-sm text-signal">{percent(answer.noul)}</p>
        </div>
        <div className="border-signal/30 bg-signal/5 rounded-md border p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-signal">{t("preview.outcome")}</p>
          <p className="mt-2 text-sm text-foreground">
            {t(isTrue ? "noul.action" : "noul.noAction")}
          </p>
        </div>
      </div>
    );
  }

  if (answer.type === "choice") {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t("preview.answer")}
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {t("preview.chose", { value: answer.choice })}
          </p>
          <p className="mt-2 font-mono text-xs text-signal">
            {t("preview.confidence", { value: (answer.confidence * 100).toFixed(1) })}
          </p>
        </div>
        <ProbabilityBars probabilities={answer.probabilities} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {t("preview.score")}
        </p>
        <p className="mt-2 text-5xl font-semibold tracking-tight">{answer.score.toFixed(2)}</p>
        <p className="mt-2 font-mono text-xs text-signal">
          {t("preview.confidence", { value: (answer.confidence * 100).toFixed(1) })}
        </p>
      </div>
      <div
        className={`rounded-md border p-4 ${
          answer.score >= threshold ? "border-signal/30 bg-signal/5" : "border-border bg-background"
        }`}
      >
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
          {t("preview.outcome")}
        </p>
        <p className="mt-2 text-sm text-foreground">
          {answer.score >= threshold ? t("score.route") : t("score.belowThreshold")}
        </p>
      </div>
      <ProbabilityBars probabilities={answer.probabilities} />
    </div>
  );
}

export function PlaygroundPreview({
  threshold,
  result,
  rawExchanges,
  error,
  isRunning,
  mode,
  latencyMs,
  onModeChange,
}: PlaygroundPreviewProps) {
  const { t } = useI18n();
  const answer = result ? Object.values(result.answers)[0] : undefined;
  const rawPayload = { normalized: result, exchanges: rawExchanges };

  return (
    <section className="flex min-h-[34rem] flex-1 flex-col bg-background lg:min-h-0">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-2">
        <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
          {latencyMs !== null ? <span>{t("preview.latency", { value: latencyMs })}</span> : null}
          {result ? <span>{t("preview.model", { value: result.model })}</span> : null}
        </div>
        <div className="flex rounded-md border border-border bg-card p-0.5">
          {(["preview", "json"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
                mode === option
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "preview" ? (
                <Eye className="size-3.5" />
              ) : (
                <Braces className="size-3.5" />
              )}
              {t(option === "preview" ? "common.preview" : "common.json")}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5 sm:p-7">
        {error ? (
          <div className="border-destructive/30 bg-destructive/5 mb-5 rounded-md border p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {mode === "json" ? (
          <pre className="min-h-full rounded-md border border-border bg-card p-4 font-mono text-xs leading-5 text-foreground">
            {JSON.stringify(rawPayload, null, 2)}
          </pre>
        ) : isRunning ? (
          <div className="flex min-h-[28rem] items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-signal" />
          </div>
        ) : result && answer ? (
          <div className="mx-auto max-w-2xl">
            <AnswerView answer={answer} threshold={threshold} />
          </div>
        ) : (
          <div className="flex min-h-[28rem] flex-col items-center justify-center text-center">
            <div className="grid size-12 place-items-center rounded-full border border-border bg-card">
              <Play className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-5 text-sm text-muted-foreground">{t("preview.empty")}</p>
          </div>
        )}
      </div>
    </section>
  );
}
