import { Download, LoaderCircle, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/use-i18n";
import { BUILT_IN_BENCHMARKS, CUSTOM_BENCHMARK_ID } from "@/lib/benchmark";

interface BenchmarkControlsProps {
  customUrl: string;
  isLoading: boolean;
  isRunning: boolean;
  rowCount: number;
  runCount: number;
  selectedSourceId: string;
  hasResults: boolean;
  onClear: () => void;
  onCustomUrlChange: (value: string) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onLoadCustom: () => void;
  onRun: () => void;
  onRunCountChange: (value: number) => void;
  onSourceChange: (value: string) => void;
}

function countOptions(total: number): number[] {
  const options = [1, 5, 10, 20, 50, 100].filter((count) => count < total);
  return [...options, total].filter((count, index, all) => all.indexOf(count) === index);
}

export function BenchmarkControls({
  customUrl,
  isLoading,
  isRunning,
  rowCount,
  runCount,
  selectedSourceId,
  hasResults,
  onClear,
  onCustomUrlChange,
  onExportCsv,
  onExportJson,
  onLoadCustom,
  onRun,
  onRunCountChange,
  onSourceChange,
}: BenchmarkControlsProps) {
  const { t } = useI18n();
  const customSelected = selectedSourceId === CUSTOM_BENCHMARK_ID;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid items-center gap-3 lg:grid-cols-[minmax(16rem,24rem)_minmax(0,1fr)]">
        <div className="flex items-center gap-2">
          <label htmlFor="benchmark-source" className="shrink-0 text-xs font-medium">
            {t("benchmark.source")}
          </label>
          <select
            id="benchmark-source"
            value={selectedSourceId}
            disabled={isLoading || isRunning}
            onChange={(event) => onSourceChange(event.target.value)}
            className="focus:ring-ring/20 h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2"
          >
            {BUILT_IN_BENCHMARKS.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
              </option>
            ))}
            <option value={CUSTOM_BENCHMARK_ID}>{t("benchmark.custom")}</option>
          </select>
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">{t("benchmark.formatHint")}</p>
      </div>

      {customSelected ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={customUrl}
            disabled={isLoading || isRunning}
            onChange={(event) => onCustomUrlChange(event.target.value)}
            placeholder="https://example.com/benchmark.jsonl"
            aria-label={t("benchmark.url")}
            className="h-9 font-mono text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isLoading || isRunning || customUrl.trim() === ""}
            onClick={onLoadCustom}
            className="h-9 shrink-0"
          >
            {isLoading ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            {t("benchmark.load")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="benchmark-count" className="shrink-0 text-xs font-medium">
            {t("benchmark.count")}
          </label>
          <select
            id="benchmark-count"
            value={runCount}
            disabled={isLoading || isRunning || rowCount === 0}
            onChange={(event) => onRunCountChange(Number(event.target.value))}
            className="focus:ring-ring/20 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2"
          >
            {countOptions(rowCount).map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasResults}
            onClick={onExportJson}
          >
            <Download className="size-3.5" />
            {t("benchmark.exportJson")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasResults}
            onClick={onExportCsv}
          >
            <Download className="size-3.5" />
            {t("benchmark.exportCsv")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRunning || !hasResults}
            onClick={onClear}
          >
            <RotateCcw className="size-3.5" />
            {t("benchmark.clear")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading || isRunning || rowCount === 0}
            onClick={onRun}
            className="hover:bg-signal/90 border-signal bg-signal px-4 text-signal-foreground"
          >
            {isRunning ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            {t("benchmark.run", { value: runCount })}
          </Button>
        </div>
      </div>
    </div>
  );
}
