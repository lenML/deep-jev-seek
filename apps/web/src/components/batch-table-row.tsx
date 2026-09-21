import { Eraser, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import type { BatchColumn, BatchRow } from "@/lib/batch";

interface BatchTableRowProps {
  columns: BatchColumn[];
  row: BatchRow;
  rowHeight: number;
  running: boolean;
  onClearRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onPromptChange: (rowId: string, value: string) => void;
  onResizeRow: (event: ReactPointerEvent<HTMLButtonElement>) => void;
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

export function BatchTableRow({
  columns,
  row,
  rowHeight,
  running,
  onClearRow,
  onDeleteRow,
  onPromptChange,
  onResizeRow,
  onRunRow,
}: BatchTableRowProps) {
  const { t } = useI18n();
  const highest = highestProbability(row);

  return (
    <tr className="align-top" style={{ height: rowHeight }}>
      <td className="relative border-b border-border p-0">
        <Textarea
          value={row.prompt}
          disabled={running}
          onChange={(event) => onPromptChange(row.id, event.target.value)}
          aria-label={t("batch.prompt")}
          placeholder={t("batch.promptPlaceholder")}
          style={{ height: rowHeight }}
          className="!min-h-11 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-xs leading-5 shadow-none"
        />
        {row.error ? (
          <p className="border-t border-destructive px-3 py-2 text-[11px] leading-4 text-destructive">
            {row.error}
          </p>
        ) : null}
        <button
          type="button"
          aria-label={t("batch.resizeRow")}
          onPointerDown={onResizeRow}
          className="absolute inset-x-0 bottom-0 z-20 h-1.5 cursor-row-resize touch-none"
        />
      </td>
      {columns.map((column, columnIndex) => {
        const probability = row.cells[columnIndex]?.probability ?? null;
        const width = probability === null ? 0 : Math.min(100, Math.max(0, probability * 100));
        const isHighest = probability !== null && probability === highest;
        return (
          <td key={column.id} className="border-b border-l border-border p-0">
            <div
              className={`relative flex items-center justify-center overflow-hidden ${
                isHighest ? "ring-2 ring-inset ring-signal" : ""
              }`}
              style={{ height: rowHeight }}
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
      <td className="border-b border-l border-border p-0">
        <div className="flex items-center justify-center gap-1" style={{ height: rowHeight }}>
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
      </td>
    </tr>
  );
}
