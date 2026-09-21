import { useDrag } from "@use-gesture/react";
import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { clampBatchSize } from "@/lib/batch/table-size";
import { cn } from "@/lib/utils";

interface BatchResizeHandleProps {
  axis: "x" | "y";
  ariaLabel: string;
  className?: string;
  max: number;
  min: number;
  value: number;
  onValueChange: (value: number) => void;
}

export function BatchResizeHandle({
  axis,
  ariaLabel,
  className,
  max,
  min,
  value,
  onValueChange,
}: BatchResizeHandleProps) {
  const initialValue = useRef(value);
  const bind = useDrag(
    ({ first, movement }) => {
      if (first) {
        initialValue.current = value;
      }
      const delta = axis === "x" ? movement[0] : movement[1];
      onValueChange(clampBatchSize(initialValue.current + delta, min, max));
    },
    {
      axis,
      filterTaps: true,
      pointer: { capture: true },
      preventDefault: true,
    },
  );

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 32 : 8;
    const decrease = axis === "x" ? event.key === "ArrowLeft" : event.key === "ArrowUp";
    const increase = axis === "x" ? event.key === "ArrowRight" : event.key === "ArrowDown";
    if (!decrease && !increase) {
      return;
    }
    event.preventDefault();
    onValueChange(clampBatchSize(value + (increase ? step : -step), min, max));
  }

  return (
    <button
      {...bind()}
      type="button"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute z-20 touch-none",
        axis === "x"
          ? "right-0 top-0 h-full w-2 cursor-col-resize"
          : "inset-x-0 bottom-0 h-1.5 cursor-row-resize",
        className,
      )}
    />
  );
}
