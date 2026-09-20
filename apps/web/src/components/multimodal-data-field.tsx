import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";

interface MultimodalDataFieldProps {
  error: string | null;
  value: string;
  onChange: (value: string) => void;
}

export function MultimodalDataField({ error, value, onChange }: MultimodalDataFieldProps) {
  const { t } = useI18n();

  return (
    <div className="mt-5 space-y-2 border-t border-border pt-5">
      <Label htmlFor="multimodal-data">{t("multimodal.title")}</Label>
      <p id="multimodal-data-hint" className="text-[11px] leading-4 text-muted-foreground">
        {t("multimodal.hint")}
      </p>
      <Textarea
        id="multimodal-data"
        value={value}
        aria-describedby="multimodal-data-hint"
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        placeholder='["base64-data"]'
        spellCheck={false}
        className="editor-scroll min-h-24 resize-y bg-background font-mono text-[11px] leading-5"
      />
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
