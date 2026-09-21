import { Database, LoaderCircle, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { BenchmarkQuestion } from "@/components/benchmark-question";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import {
  benchmarkQuestionKey,
  benchmarkResultFromAnswer,
  buildBenchmarkQuestions,
  loadMMLUProRows,
  type BenchmarkResult,
  type MMLUProRow,
} from "@/lib/benchmark";
import { runJevSeek } from "@/lib/run";
import { useWorkbenchStore } from "@/store/workbench";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function countOptions(total: number): number[] {
  const options = [1, 5, 10, 20, 50, 100].filter((count) => count < total);
  return [...options, total].filter((count, index, all) => all.indexOf(count) === index);
}

export function BenchmarkPanel() {
  const { t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const [rows, setRows] = useState<MMLUProRow[]>([]);
  const [total, setTotal] = useState(0);
  const [runCount, setRunCount] = useState(5);
  const [results, setResults] = useState<Record<string, BenchmarkResult>>({});
  const [isLoading, setLoading] = useState(true);
  const [isRunning, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadMMLUProRows(fetch, controller.signal)
      .then((dataset) => {
        setRows(dataset.rows);
        setTotal(dataset.total);
        setRunCount(Math.min(5, dataset.rows.length));
      })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(loadError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const completed = Object.values(results).length;
  const correct = Object.values(results).filter((result) => result.correct).length;
  const accuracy = completed === 0 ? null : (correct / completed) * 100;
  const canRun =
    !isRunning &&
    rows.length > 0 &&
    (connection.provider === "llamacpp" || Boolean(connection.apiKey.trim()));

  async function handleRun() {
    setRunning(true);
    setError(null);
    try {
      const selectedRows = rows.slice(0, runCount);
      const output = await runJevSeek({
        connection,
        state: { dataset: "TIGER-Lab/MMLU-Pro", split: "validation" },
        questions: buildBenchmarkQuestions(selectedRows),
      });
      const nextResults = Object.fromEntries(
        selectedRows.map((row) => {
          const key = benchmarkQuestionKey(row);
          return [key, benchmarkResultFromAnswer(row, output.result.answers[key])];
        }),
      );
      setResults((current) => ({ ...current, ...nextResults }));
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-background">
      <div className="bg-card/40 border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-[minmax(0,1fr)_repeat(3,9rem)]">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
              <Database className="size-3.5" />
              MMLU-Pro
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("benchmark.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">
              {t("benchmark.description")}
            </p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("benchmark.total")}
            </p>
            <p className="mt-2 font-mono text-xl">{total || "—"}</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("benchmark.completed")}
            </p>
            <p className="mt-2 font-mono text-xl">{completed}</p>
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("benchmark.accuracy")}
            </p>
            <p className="mt-2 font-mono text-xl text-signal">
              {accuracy === null ? "—" : `${accuracy.toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-card p-4">
          <div className="space-y-2">
            <label htmlFor="benchmark-count" className="text-xs font-medium">
              {t("benchmark.count")}
            </label>
            <select
              id="benchmark-count"
              value={runCount}
              disabled={isLoading || isRunning}
              onChange={(event) => setRunCount(Number(event.target.value))}
              className="focus:ring-ring/20 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2"
            >
              {countOptions(rows.length).map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isRunning || completed === 0}
              onClick={() => setResults({})}
            >
              <RotateCcw className="size-3.5" />
              {t("benchmark.clear")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!canRun}
              onClick={handleRun}
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

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="size-6 animate-spin text-signal" />
          </div>
        ) : (
          <div className="space-y-3">
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
