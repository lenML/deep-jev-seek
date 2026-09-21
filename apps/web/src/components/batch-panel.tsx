import { Plus } from "lucide-react";
import { useState } from "react";

import { BatchCommonPrompt } from "@/components/batch-common-prompt";
import { BatchHeader } from "@/components/batch-header";
import { BatchImportDialog } from "@/components/batch-import-dialog";
import { BatchTable } from "@/components/batch-table";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import {
  createBatchColumn,
  createEmptyBatchRow,
  createInitialBatch,
  parseBatchText,
  resizeBatchRows,
  runBatchRows,
  type BatchRow,
} from "@/lib/batch";
import { useWorkbenchStore } from "@/store/workbench";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function clearScores(row: BatchRow): BatchRow {
  return {
    ...row,
    cells: row.cells.map(() => ({ probability: null })),
    status: "idle",
    error: null,
    durationMs: null,
  };
}

export function BatchPanel() {
  const { t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const [batch, setBatch] = useState(createInitialBatch);
  const [commonPrefix, setCommonPrefix] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(() => new Set());
  const { columns, rows } = batch;

  const isRunning = runningIds.size > 0;
  const hasActiveColumns = columns.some((column) => column.text.trim());
  const runnableRows = rows.filter((row) => row.prompt.trim() && hasActiveColumns);
  const hasExistingData =
    rows.some((row) => row.prompt.trim()) || columns.some((column) => column.text.trim());

  function updateRow(rowId: string, updater: (row: BatchRow) => BatchRow) {
    setBatch((current) => ({
      ...current,
      rows: current.rows.map((row) => (row.id === rowId ? updater(row) : row)),
    }));
  }

  function handlePromptChange(rowId: string, value: string) {
    updateRow(rowId, (row) => clearScores({ ...row, prompt: value }));
  }

  function handleColumnChange(columnId: string, value: string) {
    setBatch((current) => ({
      columns: current.columns.map((column) =>
        column.id === columnId ? { ...column, text: value } : column,
      ),
      rows: current.rows.map(clearScores),
    }));
  }

  function handleClearRow(rowId: string) {
    updateRow(rowId, clearScores);
  }

  function handleClearAllScores() {
    setBatch((current) => ({ ...current, rows: current.rows.map(clearScores) }));
  }

  function handleDeleteRow(rowId: string) {
    setBatch((current) => ({
      ...current,
      rows: current.rows.filter((row) => row.id !== rowId),
    }));
  }

  function handleAddRow() {
    setBatch((current) => ({
      ...current,
      rows: [...current.rows, createEmptyBatchRow(current.columns.length)],
    }));
  }

  function handleAddOption() {
    setBatch((current) => {
      const columns = [...current.columns, createBatchColumn()];
      return { columns, rows: resizeBatchRows(current.rows, columns.length) };
    });
  }

  function handleImport(value: string): string | null {
    try {
      setBatch(parseBatchText(value));
      setError(null);
      return null;
    } catch (importError) {
      return errorMessage(importError);
    }
  }

  async function evaluate(targetRows: BatchRow[]) {
    if (targetRows.length === 0) {
      setError(t("batch.noRows"));
      return;
    }

    const targetIds = new Set(targetRows.map((row) => row.id));
    setError(null);
    setRunningIds((current) => new Set([...current, ...targetIds]));
    setBatch((current) => ({
      ...current,
      rows: current.rows.map((row) =>
        targetIds.has(row.id)
          ? {
              ...row,
              status: "running",
              error: null,
              cells: row.cells.map(() => ({ probability: null })),
            }
          : row,
      ),
    }));

    try {
      const updates = await runBatchRows({
        columns,
        commonPrefix,
        connection,
        rows: targetRows,
      });
      setBatch((current) => ({
        ...current,
        rows: current.rows.map((row) => (updates[row.id] ? { ...row, ...updates[row.id] } : row)),
      }));
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunningIds((current) => {
        const next = new Set(current);
        for (const id of targetIds) {
          next.delete(id);
        }
        return next;
      });
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
      <BatchHeader
        canClear={rows.some((row) => row.cells.some((cell) => cell.probability !== null))}
        canRun={runnableRows.length > 0}
        isRunning={isRunning}
        onClearAll={handleClearAllScores}
        onImport={() => setImportOpen(true)}
        onRunAll={() => void evaluate(runnableRows)}
      />

      <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
        <BatchCommonPrompt
          value={commonPrefix}
          disabled={isRunning}
          onChange={(value) => {
            setCommonPrefix(value);
            setBatch((current) => ({ ...current, rows: current.rows.map(clearScores) }));
          }}
        />

        {error ? (
          <div className="rounded-md border border-destructive bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium">{t("batch.table")}</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRunning}
                onClick={handleAddOption}
              >
                <Plus className="size-3.5" />
                {t("batch.addOption")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isRunning}
                onClick={handleAddRow}
              >
                <Plus className="size-3.5" />
                {t("batch.addRow")}
              </Button>
            </div>
          </div>
          <BatchTable
            columns={columns}
            rows={rows}
            runningIds={runningIds}
            onClearRow={handleClearRow}
            onColumnChange={handleColumnChange}
            onDeleteRow={handleDeleteRow}
            onPromptChange={handlePromptChange}
            onRunRow={(rowId) => {
              const row = rows.find((item) => item.id === rowId);
              if (row) {
                void evaluate([row]);
              }
            }}
          />
        </section>
      </div>

      {importOpen ? (
        <BatchImportDialog
          disabled={isRunning}
          hasExistingData={hasExistingData}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      ) : null}
    </main>
  );
}
