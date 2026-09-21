import { FileUp, Upload } from "lucide-react";
import type { ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

interface BatchImportPanelProps {
  value: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
  onImport: () => void;
  onFile: (file: File) => void;
}

export function BatchImportPanel({
  value,
  disabled,
  onValueChange,
  onImport,
  onFile,
}: BatchImportPanelProps) {
  const { t } = useI18n();

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onFile(file);
    }
    event.target.value = "";
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileUp className="size-4 text-signal" />
            {t("batch.importTitle")}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("batch.importHint")}</p>
        </div>
        <div className="flex gap-2">
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground">
            <Upload className="size-3.5" />
            {t("batch.chooseFile")}
            <input
              type="file"
              accept=".csv,.tsv,.json,.jsonl,.txt,text/csv,application/json"
              disabled={disabled}
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <Button
            type="button"
            size="sm"
            disabled={disabled || value.trim() === ""}
            onClick={onImport}
          >
            {t("batch.import")}
          </Button>
        </div>
      </div>
      <Textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(event.target.value)}
        aria-label={t("batch.importTitle")}
        placeholder={t("batch.importPlaceholder")}
        spellCheck={false}
        className="mt-3 min-h-32 resize-y bg-background font-mono text-xs leading-5"
      />
    </section>
  );
}
