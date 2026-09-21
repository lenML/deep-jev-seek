import { useState, type PointerEvent as ReactPointerEvent } from "react";

const DEFAULT_PROMPT_WIDTH = 360;
const DEFAULT_OPTION_WIDTH = 208;
const DEFAULT_ROW_HEIGHT = 44;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useBatchTableSize() {
  const [promptWidth, setPromptWidth] = useState(DEFAULT_PROMPT_WIDTH);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  function beginResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    axis: "x" | "y",
    apply: (delta: number) => void,
  ) {
    event.preventDefault();
    const start = axis === "x" ? event.clientX : event.clientY;
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = axis === "x" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent: PointerEvent) => {
      apply((axis === "x" ? moveEvent.clientX : moveEvent.clientY) - start);
    };
    const handleUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function startPromptResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const initial = promptWidth;
    beginResize(event, "x", (delta) => setPromptWidth(clamp(initial + delta, 180, 720)));
  }

  function startColumnResize(event: ReactPointerEvent<HTMLButtonElement>, columnId: string) {
    const initial = columnWidths[columnId] ?? DEFAULT_OPTION_WIDTH;
    beginResize(event, "x", (delta) =>
      setColumnWidths((current) => ({
        ...current,
        [columnId]: clamp(initial + delta, 96, 480),
      })),
    );
  }

  function startRowResize(event: ReactPointerEvent<HTMLButtonElement>, rowId: string) {
    const initial = rowHeights[rowId] ?? DEFAULT_ROW_HEIGHT;
    beginResize(event, "y", (delta) =>
      setRowHeights((current) => ({
        ...current,
        [rowId]: clamp(initial + delta, 44, 240),
      })),
    );
  }

  return {
    columnWidth: (columnId: string) => columnWidths[columnId] ?? DEFAULT_OPTION_WIDTH,
    promptWidth,
    rowHeight: (rowId: string) => rowHeights[rowId] ?? DEFAULT_ROW_HEIGHT,
    startColumnResize,
    startPromptResize,
    startRowResize,
  };
}
