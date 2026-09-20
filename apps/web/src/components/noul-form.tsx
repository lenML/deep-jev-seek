import { Textarea } from "@/components/ui/textarea";

import { FieldLabel, ProbeEditor, QuestionEditor, Threshold } from "@/components/form-fields";
import { useI18n } from "@/i18n/use-i18n";
import type { NoulDraft } from "@/lib/playground";

export function NoulForm({
  draft,
  onChange,
}: {
  draft: NoulDraft;
  onChange: (draft: NoulDraft) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <ProbeEditor value={draft.state} onChange={(state) => onChange({ ...draft, state })} />
      <QuestionEditor
        value={draft.question}
        onChange={(question) => onChange({ ...draft, question })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel>{t("noul.trueWhen")}</FieldLabel>
          <Textarea
            value={draft.trueWhen}
            onChange={(event) => onChange({ ...draft, trueWhen: event.target.value })}
            aria-label={t("noul.trueWhen")}
            className="border-signal/50 min-h-28 resize-y bg-background text-xs leading-5"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel>{t("noul.falseWhen")}</FieldLabel>
          <Textarea
            value={draft.falseWhen}
            onChange={(event) => onChange({ ...draft, falseWhen: event.target.value })}
            aria-label={t("noul.falseWhen")}
            className="border-destructive/50 min-h-28 resize-y bg-background text-xs leading-5"
          />
        </div>
      </div>
      <Threshold
        value={draft.threshold}
        onChange={(threshold) => onChange({ ...draft, threshold })}
        labelKey="noul.threshold"
        resultKey="noul.trigger"
      />
    </div>
  );
}
