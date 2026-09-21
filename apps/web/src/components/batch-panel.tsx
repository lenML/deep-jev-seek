import { Plus } from "lucide-react";
import { useState } from "react";

import { BatchHeader } from "@/components/batch-header";
import { BatchImportPanel } from "@/components/batch-import-panel";
import { BatchTable } from "@/components/batch-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import {
  DEFAULT_OPTION_COLUMNS,
  createEmptyBatchRow,
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
    options: row.options.map((option) => ({ ...option, probability: null })),
    status: "idle",
    error: null,
    durationMs: null,
  };
}

export function BatchPanel() {
  const { t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const [rows, setRows] = useState<BatchRow[]>(() => [createEmptyBatchRow()]);
  const [columnCount, setColumnCount] = useState(DEFAULT_OPTION_COLUMNS);
  const [commonPrefix, setCommonPrefix] = useState("");
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [runningIds, setRunningIds] = useState<Set<string>>(() => new Set());

  const isRunning = runningIds.size > 0;
  const runnableRows = rows.filter(
    (row) => row.prompt.trim() && row.options.some((option) => option.text.trim()),
  );

  function updateRow(rowId: string, updater: (row: BatchRow) => BatchRow) {
    setRows((current) => current.map((row) => (row.id === rowId ? updater(row) : row)));
  }

  function handlePromptChange(rowId: string, value: string) {
    updateRow(rowId, (row) => clearScores({ ...row, prompt: value }));
  }

  function handleOptionChange(rowId: string, optionIndex: number, value: string) {
    updateRow(rowId, (row) =>
      clearScores({
        ...row,
        options: row.options.map((option, index) =>
          index === optionIndex ? { ...option, text: value } : option,
        ),
      }),
    );
  }

  function handleClearRow(rowId: string) {
    updateRow(rowId, clearScores);
  }

  function handleClearAllScores() {
    setRows((current) => current.map(clearScores));
  }

  function handleDeleteRow(rowId: string) {
    setRows((current) => current.filter((row) => row.id !== rowId));
  }

  function handleAddRow() {
    setRows((current) => [...current, createEmptyBatchRow(columnCount)]);
  }

  function handleAddOption() {
    const nextCount = columnCount + 1;
    setColumnCount(nextCount);
    setRows((current) => resizeBatchRows(current, nextCount));
  }

  function replaceRows(nextRows: BatchRow[]) {
    setRows(nextRows);
    setColumnCount(nextRows[0]?.options.length ?? DEFAULT_OPTION_COLUMNS);
    setError(null);
  }

  function handleImport() {
    try {
      replaceRows(parseBatchText(importText));
      setImportText("");
    } catch (importError) {
      setError(errorMessage(importError));
    }
  }

  async function handleFile(file: File) {
    try {
      replaceRows(parseBatchText(await file.text()));
      setImportText("");
    } catch (importError) {
      setError(errorMessage(importError));
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
    setRows((current) =>
      current.map((row) =>
        targetIds.has(row.id)
          ? {
              ...row,
              status: "running",
              error: null,
              options: row.options.map((option) => ({ ...option, probability: null })),
            }
          : row,
      ),
    );

    try {
      const updates = await runBatchRows({ connection, commonPrefix, rows: targetRows });
      setRows((current) =>
        current.map((row) => (updates[row.id] ? { ...row, ...updates[row.id] } : row)),
      );
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
        canClear={rows.some((row) => row.options.some((option) => option.probability !== null))}
        canRun={runnableRows.length > 0}
        isRunning={isRunning}
        onClearAll={handleClearAllScores}
        onRunAll={() => void evaluate(runnableRows)}
      />

      <div className="mx-auto max-w-[1600px] space-y-4 p-4 sm:p-6">
        <BatchImportPanel
          value={importText}
          disabled={isRunning}
          onValueChange={setImportText}
          onImport={handleImport}
          onFile={(file) => void handleFile(file)}
        />

        <section className="rounded-lg border border-border bg-card p-4">
          <label htmlFor="batch-common-prefix" className="text-sm font-medium">
            {t("batch.commonPrompt")}
          </label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("batch.commonPromptHint")}
          </p>
          <Textarea
            id="batch-common-prefix"
            value={commonPrefix}
            disabled={isRunning}
            onChange={(event) => {
              setCommonPrefix(event.target.value);
              setRows((current) => current.map(clearScores));
            }}
            placeholder={t("batch.commonPromptPlaceholder")}
            className="mt-3 min-h-20 resize-y bg-background text-xs leading-5"
          />
        </section>

        {error ? (
          <div className="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-sm text-destructive">
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
            rows={rows}
            columnCount={columnCount}
            runningIds={runningIds}
            onClearRow={handleClearRow}
            onDeleteRow={handleDeleteRow}
            onOptionChange={handleOptionChange}
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
    </main>
  );
}
