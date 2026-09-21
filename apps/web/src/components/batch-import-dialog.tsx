import { FileUp, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

interface BatchImportDialogProps {
  disabled: boolean;
  hasExistingData: boolean;
  onClose: () => void;
  onImport: (value: string) => string | null;
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function BatchImportDialog({
  disabled,
  hasExistingData,
  onClose,
  onImport,
}: BatchImportDialogProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: {
      "application/json": [".json"],
      "application/x-ndjson": [".jsonl"],
      "text/csv": [".csv"],
      "text/plain": [".jsonl", ".txt"],
      "text/tab-separated-values": [".tsv"],
    },
    disabled,
    maxFiles: 1,
    maxSize: MAX_IMPORT_BYTES,
    multiple: false,
    onDropAccepted: ([file]) => {
      if (file) {
        void handleFile(file);
      }
    },
    onDropRejected: ([rejection]) => {
      setError(
        rejection?.errors[0]?.code === "file-too-large"
          ? t("batch.fileTooLarge")
          : t("batch.fileType"),
      );
    },
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (confirming) {
        setConfirming(false);
      } else {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [confirming, onClose]);

  function submit() {
    const importError = onImport(value);
    if (importError) {
      setError(importError);
      setConfirming(false);
      return;
    }
    onClose();
  }

  function requestImport() {
    if (!value.trim() || disabled) {
      return;
    }
    if (hasExistingData) {
      setConfirming(true);
      return;
    }
    submit();
  }

  async function handleFile(file: File) {
    setValue(await file.text());
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[1px] duration-200 animate-in fade-in-0"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-import-title"
        className="relative flex max-h-[min(90dvh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div id="batch-import-title" className="flex items-center gap-2 text-sm font-semibold">
              <FileUp className="size-4 text-signal" />
              {t("batch.importTitle")}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("batch.importHint")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        {confirming ? (
          <div className="space-y-4 px-5 py-8">
            <h3 className="text-base font-semibold">{t("batch.importOverwriteTitle")}</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {t("batch.importOverwriteHint")}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="button" onClick={submit}>
                {t("batch.confirmImport")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div
                {...getRootProps({
                  className: `flex h-11 w-full cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-signal/60 hover:bg-signal/5 hover:text-foreground ${
                    isDragActive ? "border-signal bg-signal/5 text-foreground" : ""
                  } ${disabled ? "pointer-events-none opacity-50" : ""}`,
                })}
              >
                <input {...getInputProps({ "aria-label": t("batch.chooseFile") })} />
                <Upload className="size-3.5" />
                {t("batch.chooseFile")}
              </div>
              <Textarea
                value={value}
                disabled={disabled}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
                aria-label={t("batch.importTitle")}
                placeholder={t("batch.importPlaceholder")}
                spellCheck={false}
                className="editor-scroll min-h-64 resize-y bg-background font-mono text-xs leading-5"
              />
              {error ? (
                <p role="alert" className="text-xs leading-5 text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={disabled || value.trim() === ""}
                onClick={requestImport}
              >
                {disabled ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                {t("batch.import")}
              </Button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
