import { Eraser, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import type { BatchColumn, BatchRow } from "@/lib/batch";

interface BatchTableProps {
  columns: BatchColumn[];
  rows: BatchRow[];
  runningIds: Set<string>;
  onClearRow: (rowId: string) => void;
  onColumnChange: (columnId: string, value: string) => void;
  onDeleteRow: (rowId: string) => void;
  onPromptChange: (rowId: string, value: string) => void;
  onRunRow: (rowId: string) => void;
}

function formatPercent(value: number): string {
  const probability = Math.min(1, Math.max(0, value));
  return `${(probability * 100).toFixed(probability >= 0.995 || probability <= 0.005 ? 0 : 1)}%`;
}

function highestProbability(row: BatchRow): number | null {
  const values = row.cells.flatMap((cell) => (cell.probability === null ? [] : [cell.probability]));
  return values.length > 0 ? Math.max(...values) : null;
}

export function BatchTable({
  columns,
  rows,
  runningIds,
  onClearRow,
  onColumnChange,
  onDeleteRow,
  onPromptChange,
  onRunRow,
}: BatchTableProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th className="w-[24rem] border-b border-border p-0 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <div className="flex min-h-16 items-center px-3 py-3">{t("batch.prompt")}</div>
            </th>
            {columns.map((column, index) => (
              <th key={column.id} className="w-52 border-b border-l border-border p-0">
                <Textarea
                  value={column.text}
                  onChange={(event) => onColumnChange(column.id, event.target.value)}
                  aria-label={t("batch.option", { value: index + 1 })}
                  placeholder={t("batch.optionPlaceholder", { value: index + 1 })}
                  className="min-h-16 resize-none rounded-none border-0 bg-card px-3 py-3 text-center text-xs font-medium leading-5 shadow-none"
                />
              </th>
            ))}
            <th className="w-32 border-b border-l border-border p-0 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              <div className="flex min-h-16 items-center px-3 py-3">{t("batch.actions")}</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const running = runningIds.has(row.id);
            const highest = highestProbability(row);
            return (
              <tr key={row.id} className="align-top">
                <td className="border-b border-border p-0">
                  <Textarea
                    value={row.prompt}
                    disabled={running}
                    onChange={(event) => onPromptChange(row.id, event.target.value)}
                    aria-label={t("batch.prompt")}
                    placeholder={t("batch.promptPlaceholder")}
                    className="min-h-28 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-xs leading-5 shadow-none"
                  />
                  {row.error ? (
                    <p className="border-t border-destructive px-3 py-2 text-[11px] leading-4 text-destructive">
                      {row.error}
                    </p>
                  ) : null}
                </td>
                {columns.map((column, columnIndex) => {
                  const probability = row.cells[columnIndex]?.probability ?? null;
                  const width =
                    probability === null ? 0 : Math.min(100, Math.max(0, probability * 100));
                  const isHighest = probability !== null && probability === highest;
                  return (
                    <td key={column.id} className="border-b border-l border-border p-0">
                      <div
                        className={`relative flex min-h-28 items-center justify-center overflow-hidden ${
                          isHighest ? "ring-2 ring-inset ring-signal" : ""
                        }`}
                        role="progressbar"
                        aria-label={`${column.text || t("batch.option", { value: columnIndex + 1 })}: ${
                          probability === null ? "—" : formatPercent(probability)
                        }`}
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
                          className={`relative font-mono text-xs ${
                            isHighest ? "font-semibold text-signal-foreground" : "text-foreground"
                          }`}
                        >
                          {probability === null ? "—" : formatPercent(probability)}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="border-b border-l border-border p-3">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => onRunRow(row.id)}
                      aria-label={t("batch.evaluateRow")}
                      title={t("batch.evaluateRow")}
                      className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                    >
                      {running ? (
                        <LoaderCircle className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => onClearRow(row.id)}
                      aria-label={t("batch.clearRow")}
                      title={t("batch.clearRow")}
                      className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50"
                    >
                      <Eraser className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => onDeleteRow(row.id)}
                      aria-label={t("batch.deleteRow")}
                      title={t("batch.deleteRow")}
                      className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {row.durationMs === null ? null : (
                    <p className="mt-2 text-center font-mono text-[10px] text-signal">
                      {t("benchmark.questionDuration", { value: row.durationMs })}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("batch.empty")}</p>
      ) : null}
    </div>
  );
}
