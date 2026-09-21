import { Eraser, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import type { BatchRow } from "@/lib/batch";

interface BatchTableProps {
  rows: BatchRow[];
  columnCount: number;
  runningIds: Set<string>;
  onClearRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onOptionChange: (rowId: string, optionIndex: number, value: string) => void;
  onPromptChange: (rowId: string, value: string) => void;
  onRunRow: (rowId: string) => void;
}

function formatPercent(value: number): string {
  const probability = Math.min(1, Math.max(0, value));
  return `${(probability * 100).toFixed(probability >= 0.995 || probability <= 0.005 ? 0 : 1)}%`;
}

export function BatchTable({
  rows,
  columnCount,
  runningIds,
  onClearRow,
  onDeleteRow,
  onOptionChange,
  onPromptChange,
  onRunRow,
}: BatchTableProps) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[1100px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            <th className="w-[30rem] border-b border-border px-3 py-3 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("batch.prompt")}
            </th>
            {Array.from({ length: columnCount }, (_, index) => (
              <th
                key={index}
                className="w-64 border-b border-l border-border px-3 py-3 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
              >
                {t("batch.option", { value: index + 1 })}
              </th>
            ))}
            <th className="w-28 border-b border-l border-border px-3 py-3 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("batch.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const running = runningIds.has(row.id);
            return (
              <tr key={row.id} className="align-top">
                <td className="border-b border-border p-3">
                  <Textarea
                    value={row.prompt}
                    disabled={running}
                    onChange={(event) => onPromptChange(row.id, event.target.value)}
                    aria-label={t("batch.prompt")}
                    placeholder={t("batch.promptPlaceholder")}
                    className="min-h-24 resize-y bg-background text-xs leading-5"
                  />
                  {row.error ? (
                    <p className="mt-2 text-[11px] leading-4 text-destructive">{row.error}</p>
                  ) : null}
                </td>
                {row.options.map((option, optionIndex) => {
                  const probability = option.probability;
                  const width =
                    probability === null ? 0 : Math.min(100, Math.max(0, probability * 100));
                  return (
                    <td key={optionIndex} className="border-b border-l border-border p-3">
                      <Input
                        value={option.text}
                        disabled={running}
                        onChange={(event) =>
                          onOptionChange(row.id, optionIndex, event.target.value)
                        }
                        aria-label={t("batch.option", { value: optionIndex + 1 })}
                        placeholder={t("batch.optionPlaceholder", { value: optionIndex + 1 })}
                        className="h-9 bg-background text-xs"
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            aria-hidden="true"
                            className="h-full rounded-full bg-signal transition-[width] duration-500"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <span className="w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                          {probability === null ? "—" : formatPercent(probability)}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="border-b border-l border-border p-3">
                  <div className="flex items-center gap-1">
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
                    <p className="mt-2 font-mono text-[10px] text-signal">
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
