import { LayoutGrid, Table2 } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";

export type BenchmarkViewMode = "cards" | "table";
export type BenchmarkColumnCount = 0 | 1 | 2 | 3 | 4;

interface BenchmarkViewControlsProps {
  columnCount: BenchmarkColumnCount;
  viewMode: BenchmarkViewMode;
  onColumnCountChange: (count: BenchmarkColumnCount) => void;
  onViewModeChange: (mode: BenchmarkViewMode) => void;
}

export function BenchmarkViewControls({
  columnCount,
  viewMode,
  onColumnCountChange,
  onViewModeChange,
}: BenchmarkViewControlsProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-medium">{t("benchmark.view")}</span>
        <div className="flex rounded-md border border-border bg-background p-0.5">
          {(
            [
              ["cards", LayoutGrid, "benchmark.view.cards"],
              ["table", Table2, "benchmark.view.table"],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => onViewModeChange(mode)}
              className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs ${
                viewMode === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {t(label)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="benchmark-columns" className="shrink-0 text-xs font-medium">
          {t("benchmark.columns")}
        </label>
        <select
          id="benchmark-columns"
          value={columnCount}
          disabled={viewMode === "table"}
          onChange={(event) =>
            onColumnCountChange(Number(event.target.value) as BenchmarkColumnCount)
          }
          className="focus:ring-ring/20 h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 disabled:opacity-50"
        >
          <option value={0}>{t("benchmark.columns.auto")}</option>
          {[1, 2, 3, 4].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
