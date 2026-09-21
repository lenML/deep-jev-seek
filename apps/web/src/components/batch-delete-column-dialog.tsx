import { X } from "lucide-react";

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
import { useI18n } from "@/i18n/use-i18n";

interface BatchDeleteColumnDialogProps {
  columnName: string;
  open: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function BatchDeleteColumnDialog({
  columnName,
  open,
  onConfirm,
  onOpenChange,
}: BatchDeleteColumnDialogProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-labelledby="batch-delete-column-title">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <AlertDialogTitle id="batch-delete-column-title">
            {t("batch.deleteOptionTitle")}
          </AlertDialogTitle>
          <AlertDialogCancel asChild>
            <button
              type="button"
              aria-label={t("common.close")}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </AlertDialogCancel>
        </header>
        <div className="space-y-5 px-5 py-5">
          <AlertDialogDescription>
            {t("batch.deleteOptionHint", { value: columnName || t("batch.untitledOption") })}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button type="button" variant="ghost">
                {t("common.cancel")}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button type="button" variant="destructive" onClick={onConfirm}>
                {t("batch.deleteOptionConfirm")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
