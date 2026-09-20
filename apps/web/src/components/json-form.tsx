import { Textarea } from "@/components/ui/textarea";

import { FieldLabel } from "@/components/form-fields";
import { useI18n } from "@/i18n/use-i18n";

export function JsonForm({
  stateText,
  questionsText,
  stateError,
  questionsError,
  onStateChange,
  onQuestionsChange,
}: {
  stateText: string;
  questionsText: string;
  stateError: string | null;
  questionsError: string | null;
  onStateChange: (value: string) => void;
  onQuestionsChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <FieldLabel>{t("input.state")}</FieldLabel>
        <Textarea
          value={stateText}
          aria-label={t("input.state")}
          onChange={(event) => onStateChange(event.target.value)}
          className="min-h-44 resize-y bg-background font-mono text-xs leading-5"
          aria-invalid={Boolean(stateError)}
        />
        {stateError ? <p className="text-xs text-destructive">{stateError}</p> : null}
      </div>
      <div className="space-y-2">
        <FieldLabel>{t("input.question")}</FieldLabel>
        <Textarea
          value={questionsText}
          aria-label={t("input.question")}
          onChange={(event) => onQuestionsChange(event.target.value)}
          className="min-h-72 resize-y bg-background font-mono text-xs leading-5"
          aria-invalid={Boolean(questionsError)}
        />
        {questionsError ? <p className="text-xs text-destructive">{questionsError}</p> : null}
      </div>
    </div>
  );
}
