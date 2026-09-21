import { Database } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";

interface BenchmarkHeaderProps {
  sourceName: string;
  total: number;
  completed: number;
  accuracy: number | null;
  lastRunLatencyMs: number | null;
}

export function BenchmarkHeader({
  sourceName,
  total,
  completed,
  accuracy,
  lastRunLatencyMs,
}: BenchmarkHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="bg-card/40 border-b border-border">
      <div className="mx-auto grid max-w-[1600px] items-center gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,9rem)]">
        <div className="flex min-w-0 items-center gap-2 sm:col-span-2 lg:col-span-1">
          <Database className="size-3.5 shrink-0 text-signal" />
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            {sourceName}
          </span>
          <span className="shrink-0 text-muted-foreground">·</span>
          <h2 className="shrink-0 text-base font-semibold tracking-tight">
            {t("benchmark.title")}
          </h2>
          <span className="shrink-0 text-muted-foreground">·</span>
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {t("benchmark.description")}
          </p>
        </div>
        <BenchmarkMetric label={t("benchmark.total")} value={total || "—"} />
        <BenchmarkMetric label={t("benchmark.completed")} value={completed} />
        <BenchmarkMetric
          label={t("benchmark.accuracy")}
          value={accuracy === null ? "—" : `${accuracy.toFixed(1)}%`}
          signal
        />
        <BenchmarkMetric
          label={t("benchmark.lastRun")}
          value={
            lastRunLatencyMs === null
              ? "—"
              : t("benchmark.questionDuration", { value: lastRunLatencyMs })
          }
        />
      </div>
    </div>
  );
}

function BenchmarkMetric({
  label,
  value,
  signal = false,
}: {
  label: string;
  value: string | number;
  signal?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
      <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={`shrink-0 font-mono text-base ${signal ? "text-signal" : ""}`}>{value}</p>
    </div>
  );
}
