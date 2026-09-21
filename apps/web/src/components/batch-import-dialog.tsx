import { FileUp, LoaderCircle, Upload, X } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

interface BatchImportDialogProps {
  disabled: boolean;
  hasExistingData: boolean;
  open: boolean;
  onImport: (value: string) => string | null;
  onOpenChange: (open: boolean) => void;
}

const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

export function BatchImportDialog({
  disabled,
  hasExistingData,
  open,
  onImport,
  onOpenChange,
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

  function submit() {
    const importError = onImport(value);
    if (importError) {
      setError(importError);
      setConfirming(false);
      return;
    }
    setValue("");
    setConfirming(false);
    onOpenChange(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          aria-labelledby="batch-import-title"
          aria-describedby="batch-import-description"
          className="flex max-h-[min(90dvh,48rem)] max-w-2xl flex-col data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <DialogTitle id="batch-import-title" className="flex items-center gap-2">
                <FileUp className="size-4 text-signal" />
                {t("batch.importTitle")}
              </DialogTitle>
              <DialogDescription id="batch-import-description" className="mt-1">
                {t("batch.importHint")}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label={t("common.close")}
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </DialogClose>
          </header>

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
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("common.cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              disabled={disabled || value.trim() === ""}
              onClick={requestImport}
            >
              {disabled ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {t("batch.import")}
            </Button>
          </footer>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent aria-labelledby="batch-import-confirm-title">
          <div className="space-y-4 px-5 py-5">
            <AlertDialogTitle id="batch-import-confirm-title">
              {t("batch.importOverwriteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("batch.importOverwriteHint")}</AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Button type="button" variant="ghost">
                  {t("common.cancel")}
                </Button>
              </AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button type="button" onClick={submit}>
                  {t("batch.confirmImport")}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
