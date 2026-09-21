import { Plus, X } from "lucide-react";
import { useState } from "react";

import { BatchDeleteColumnDialog } from "@/components/batch-delete-column-dialog";
import { BatchResizeHandle } from "@/components/batch-resize-handle";
import { BatchTableRow } from "@/components/batch-table-row";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import type { BatchColumn, BatchRow } from "@/lib/batch";
import { useBatchTableSize } from "@/lib/batch/table-size";

interface BatchTableProps {
  columns: BatchColumn[];
  rows: BatchRow[];
  runningIds: Set<string>;
  onAddRow: () => void;
  onClearRow: (rowId: string) => void;
  onColumnChange: (columnId: string, value: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onPromptChange: (rowId: string, value: string) => void;
  onRunRow: (rowId: string) => void;
}

export function BatchTable({
  columns,
  rows,
  runningIds,
  onAddRow,
  onClearRow,
  onColumnChange,
  onDeleteColumn,
  onDeleteRow,
  onPromptChange,
  onRunRow,
}: BatchTableProps) {
  const { t } = useI18n();
  const [columnToDelete, setColumnToDelete] = useState<BatchColumn | null>(null);
  const sizes = useBatchTableSize();
  const tableWidth =
    sizes.promptWidth +
    columns.reduce((sum, column) => sum + sizes.columnWidth(column.id), 0) +
    128;

  function confirmDeleteColumn() {
    if (columnToDelete) {
      onDeleteColumn(columnToDelete.id);
    }
    setColumnToDelete(null);
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table
            className="w-full table-fixed border-separate border-spacing-0"
            style={{ minWidth: tableWidth }}
          >
            <colgroup>
              <col style={{ width: sizes.promptWidth }} />
              {columns.map((column) => (
                <col key={column.id} style={{ width: sizes.columnWidth(column.id) }} />
              ))}
              <col style={{ width: 128 }} />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-card">
              <tr>
                <th className="group relative border-b border-border p-0 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <div className="flex h-11 items-center px-3">{t("batch.prompt")}</div>
                  <BatchResizeHandle
                    axis="x"
                    ariaLabel={t("batch.resizeColumn")}
                    max={720}
                    min={180}
                    value={sizes.promptWidth}
                    onValueChange={sizes.updatePromptWidth}
                  />
                </th>
                {columns.map((column, index) => (
                  <th
                    key={column.id}
                    className="group relative border-b border-l border-border p-0"
                  >
                    <Textarea
                      value={column.text}
                      onChange={(event) => onColumnChange(column.id, event.target.value)}
                      aria-label={t("batch.option", { value: index + 1 })}
                      placeholder={t("batch.optionPlaceholder", { value: index + 1 })}
                      className="h-11 !min-h-11 resize-none rounded-none border-0 bg-card px-3 py-3 pr-12 text-center text-xs font-medium leading-5 shadow-none"
                    />
                    <button
                      type="button"
                      onClick={() => setColumnToDelete(column)}
                      aria-label={t("batch.deleteOption", { value: index + 1 })}
                      title={t("batch.deleteOption", { value: index + 1 })}
                      className="absolute right-7 top-1.5 z-20 rounded bg-popover p-1 text-muted-foreground opacity-100 hover:text-destructive sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                    <BatchResizeHandle
                      axis="x"
                      ariaLabel={t("batch.resizeColumn")}
                      max={480}
                      min={96}
                      value={sizes.columnWidth(column.id)}
                      onValueChange={(value) => sizes.updateColumnWidth(column.id, value)}
                    />
                  </th>
                ))}
                <th className="border-b border-l border-border p-0 text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <div className="flex h-11 items-center justify-center px-3">
                    {t("batch.actions")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const running = runningIds.has(row.id);
                const rowHeight = sizes.rowHeight(row.id);
                return (
                  <BatchTableRow
                    key={row.id}
                    columns={columns}
                    row={row}
                    rowHeight={rowHeight}
                    running={running}
                    onClearRow={onClearRow}
                    onDeleteRow={onDeleteRow}
                    onPromptChange={onPromptChange}
                    onRowHeightChange={(value) => sizes.updateRowHeight(row.id, value)}
                    onRunRow={onRunRow}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={onAddRow}
          className="flex w-full items-center justify-center gap-2 border-t border-border py-3 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Plus className="size-3.5" />
          {t("batch.addRow")}
        </button>
      </div>

      <BatchDeleteColumnDialog
        columnName={columnToDelete?.text ?? ""}
        open={columnToDelete !== null}
        onConfirm={confirmDeleteColumn}
        onOpenChange={(open) => {
          if (!open) {
            setColumnToDelete(null);
          }
        }}
      />
    </>
  );
}
