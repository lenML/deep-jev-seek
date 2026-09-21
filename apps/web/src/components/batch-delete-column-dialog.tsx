import { X } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";

interface BatchDeleteColumnDialogProps {
  columnName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchDeleteColumnDialog({
  columnName,
  onClose,
  onConfirm,
}: BatchDeleteColumnDialogProps) {
  const { t } = useI18n();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

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
        aria-labelledby="batch-delete-column-title"
        className="relative w-full max-w-md rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl duration-200 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <h3 id="batch-delete-column-title" className="text-sm font-semibold">
            {t("batch.deleteOptionTitle")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-5 px-5 py-5">
          <p className="text-sm leading-6 text-muted-foreground">
            {t("batch.deleteOptionHint", { value: columnName || t("batch.untitledOption") })}
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm}>
              {t("batch.deleteOptionConfirm")}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
