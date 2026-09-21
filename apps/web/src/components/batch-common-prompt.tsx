import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

interface BatchCommonPromptProps {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}

function previewValue(value: string) {
  return value.length > 72 ? `${value.slice(0, 72)}...` : value;
}

export function BatchCommonPrompt({ disabled, value, onChange }: BatchCommonPromptProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary"
      >
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
        <span className="shrink-0 text-sm font-medium">{t("batch.commonPrompt")}</span>
        {!expanded && value.trim() ? (
          <span className="min-w-0 flex-1 truncate text-right font-mono text-[11px] text-muted-foreground">
            {previewValue(value)}
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-right text-xs text-muted-foreground">
            {t("batch.commonPromptHint")}
          </span>
        )}
      </button>
      {expanded ? (
        <div className="border-t border-border p-4">
          <Textarea
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t("batch.commonPromptPlaceholder")}
            className="min-h-24 resize-y bg-background text-xs leading-5"
          />
        </div>
      ) : null}
    </section>
  );
}
