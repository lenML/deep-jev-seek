import { Eraser, FileUp, Layers3, LoaderCircle, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

interface BatchHeaderProps {
  canClear: boolean;
  canRun: boolean;
  isRunning: boolean;
  onClearAll: () => void;
  onImport: () => void;
  onRunAll: () => void;
}

export function BatchHeader({
  canClear,
  canRun,
  isRunning,
  onClearAll,
  onImport,
  onRunAll,
}: BatchHeaderProps) {
  const { t } = useI18n();

  return (
    <div className="bg-card/40 border-b border-border">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-end justify-between gap-4 px-4 py-6 sm:px-6">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-signal">
            <Layers3 className="size-3.5" />
            Batch
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("batch.title")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">
            {t("batch.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isRunning} onClick={onImport}>
            <FileUp className="size-3.5" />
            {t("batch.importTitle")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isRunning || !canClear}
            onClick={onClearAll}
          >
            <Eraser className="size-3.5" />
            {t("batch.clearScores")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isRunning || !canRun}
            onClick={onRunAll}
            className="border-signal bg-signal px-4 text-signal-foreground hover:opacity-90"
          >
            {isRunning ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            {t("batch.runAll")}
          </Button>
        </div>
      </div>
    </div>
  );
}
