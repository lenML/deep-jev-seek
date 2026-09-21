import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { BenchmarkControls } from "@/components/benchmark-controls";
import { BenchmarkHeader } from "@/components/benchmark-header";
import { BenchmarkQuestion } from "@/components/benchmark-question";
import { BenchmarkResultsTable } from "@/components/benchmark-results-table";
import {
  BenchmarkViewControls,
  type BenchmarkColumnCount,
  type BenchmarkViewMode,
} from "@/components/benchmark-view-controls";
import { useI18n } from "@/i18n/use-i18n";
import {
  BUILT_IN_BENCHMARKS,
  CUSTOM_BENCHMARK_ID,
  benchmarkQuestionKey,
  createCustomBenchmarkSource,
  downloadBenchmarkCsv,
  downloadBenchmarkJson,
  findBuiltInBenchmark,
  loadBenchmarkDataset,
  runBenchmarkRows,
  type BenchmarkResult,
  type BenchmarkSource,
} from "@/lib/benchmark";
import { useWorkbenchStore } from "@/store/workbench";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function sourceForSelection(sourceId: string, customUrl: string): BenchmarkSource | null {
  if (sourceId !== CUSTOM_BENCHMARK_ID) {
    return findBuiltInBenchmark(sourceId) ?? BUILT_IN_BENCHMARKS[0]!;
  }
  return createCustomBenchmarkSource(customUrl);
}

function gridColumnClass(columnCount: BenchmarkColumnCount): string {
  switch (columnCount) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 md:grid-cols-2";
    case 3:
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    case 4:
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";
    default:
      return "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3";
  }
}

export function BenchmarkPanel() {
  const { t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const [selectedSourceId, setSelectedSourceId] = useState(BUILT_IN_BENCHMARKS[0]!.id);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [runCount, setRunCount] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, BenchmarkResult>>({});
  const [lastRunLatencyMs, setLastRunLatencyMs] = useState<number | null>(null);
  const [isRunning, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BenchmarkViewMode>("cards");
  const [columnCount, setColumnCount] = useState<BenchmarkColumnCount>(0);
  const activeSource = sourceForSelection(selectedSourceId, customUrl);
  const sourceName = activeSource?.name ?? t("benchmark.custom");
  const datasetQuery = useQuery({
    enabled: activeSource !== null,
    queryKey: ["benchmark-dataset", activeSource?.id ?? "none", reloadVersion],
    queryFn: ({ signal }) => loadBenchmarkDataset(activeSource!, { signal }),
  });
  const rows = datasetQuery.data?.rows ?? [];
  const total = datasetQuery.data?.total ?? 0;
  const isLoading = activeSource !== null && datasetQuery.isPending;
  const error = runError ?? (datasetQuery.error ? errorMessage(datasetQuery.error) : null);
  const effectiveRunCount =
    runCount === null ? Math.min(5, rows.length) : Math.min(runCount, rows.length);

  const completed = Object.values(results).length;
  const correct = Object.values(results).filter((result) => result.correct).length;
  const accuracy = completed === 0 ? null : (correct / completed) * 100;

  async function handleRun() {
    setRunning(true);
    setRunError(null);
    try {
      const selectedRows = rows.slice(0, effectiveRunCount);
      const output = await runBenchmarkRows({ connection, rows: selectedRows });
      setResults((current) => ({ ...current, ...output.results }));
      setLastRunLatencyMs(output.latencyMs);
    } catch (runError) {
      setRunError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  function handleLoadCustom() {
    const nextSource = createCustomBenchmarkSource(customUrlInput);
    if (!nextSource) {
      setRunError(t("benchmark.invalidUrl"));
      return;
    }
    resetDatasetState();
    setCustomUrl(nextSource.url);
    setReloadVersion((current) => current + 1);
  }

  function handleSourceChange(sourceId: string) {
    setSelectedSourceId(sourceId);
    resetDatasetState();
  }

  function resetDatasetState() {
    setResults({});
    setLastRunLatencyMs(null);
    setRunCount(null);
    setRunError(null);
  }

  function handleClear() {
    setResults({});
    setLastRunLatencyMs(null);
  }

  function handleExport(format: "csv" | "json") {
    const input = {
      modelName: connection.model,
      results,
      rows,
      taskName: sourceName,
    };
    if (format === "csv") {
      downloadBenchmarkCsv(input);
    } else {
      downloadBenchmarkJson(input);
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
      <BenchmarkHeader
        sourceName={sourceName}
        total={total}
        completed={completed}
        accuracy={accuracy}
        lastRunLatencyMs={lastRunLatencyMs}
      />

      <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
        <BenchmarkControls
          customUrl={customUrlInput}
          isLoading={isLoading}
          isRunning={isRunning}
          rowCount={rows.length}
          runCount={effectiveRunCount}
          selectedSourceId={selectedSourceId}
          hasResults={completed > 0}
          onClear={handleClear}
          onCustomUrlChange={setCustomUrlInput}
          onExportCsv={() => handleExport("csv")}
          onExportJson={() => handleExport("json")}
          onLoadCustom={handleLoadCustom}
          onRun={handleRun}
          onRunCountChange={setRunCount}
          onSourceChange={handleSourceChange}
        />

        <BenchmarkViewControls
          columnCount={columnCount}
          viewMode={viewMode}
          onColumnCountChange={setColumnCount}
          onViewModeChange={setViewMode}
        />

        {error ? (
          <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-signal" />
          </div>
        ) : viewMode === "table" ? (
          <BenchmarkResultsTable results={results} rows={rows} />
        ) : (
          <div className={`grid min-w-0 items-start gap-3 ${gridColumnClass(columnCount)}`}>
            {rows.map((row, index) => (
              <BenchmarkQuestion
                key={benchmarkQuestionKey(row)}
                index={index}
                result={results[benchmarkQuestionKey(row)]}
                row={row}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
