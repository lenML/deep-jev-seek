import { useState } from "react";

const DEFAULT_PROMPT_WIDTH = 360;
const DEFAULT_OPTION_WIDTH = 208;
const DEFAULT_ROW_HEIGHT = 44;

export function clampBatchSize(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useBatchTableSize() {
  const [promptWidth, setPromptWidth] = useState(DEFAULT_PROMPT_WIDTH);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  function updatePromptWidth(value: number) {
    setPromptWidth(clampBatchSize(value, 180, 720));
  }

  function updateColumnWidth(columnId: string, value: number) {
    setColumnWidths((current) => ({
      ...current,
      [columnId]: clampBatchSize(value, 96, 480),
    }));
  }

  function updateRowHeight(rowId: string, value: number) {
    setRowHeights((current) => ({
      ...current,
      [rowId]: clampBatchSize(value, 44, 240),
    }));
  }

  return {
    columnWidth: (columnId: string) => columnWidths[columnId] ?? DEFAULT_OPTION_WIDTH,
    promptWidth,
    rowHeight: (rowId: string) => rowHeights[rowId] ?? DEFAULT_ROW_HEIGHT,
    updateColumnWidth,
    updatePromptWidth,
    updateRowHeight,
  };
}
