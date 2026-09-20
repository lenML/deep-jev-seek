import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

export function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <Label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </Label>
  );
}

export function ProbeEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <FieldLabel>{t("input.state")}</FieldLabel>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t("input.state")}
        className="min-h-36 resize-y bg-background font-mono text-xs leading-5"
      />
    </div>
  );
}

export function QuestionEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <FieldLabel>{t("input.question")}</FieldLabel>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={t("input.question")}
        className="min-h-20 resize-y bg-background text-sm leading-5"
      />
    </div>
  );
}

export function Threshold({
  value,
  max = 100,
  onChange,
  labelKey,
  resultKey,
}: {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  labelKey: "noul.threshold" | "score.threshold";
  resultKey: "noul.trigger" | "score.route";
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{t(labelKey)}</span>
        <span className="font-mono text-signal">{value}</span>
      </div>
      <input
        type="range"
        aria-label={t(labelKey)}
        min="0"
        max={max}
        value={Math.min(value, max)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-[var(--signal)]"
      />
      <p className="text-xs text-foreground">
        {resultKey === "noul.trigger" ? t(resultKey, { value }) : t(resultKey)}
      </p>
    </div>
  );
}
