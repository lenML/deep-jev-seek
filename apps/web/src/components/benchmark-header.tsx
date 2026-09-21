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
      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-6 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(4,9rem)]">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            <Database className="size-3.5" />
            {sourceName}
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("benchmark.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">
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
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-xl ${signal ? "text-signal" : ""}`}>{value}</p>
    </div>
  );
}
