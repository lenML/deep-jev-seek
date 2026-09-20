import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { FieldLabel, ProbeEditor, QuestionEditor } from "@/components/form-fields";
import { useI18n } from "@/i18n/use-i18n";
import type { ChoiceDraft } from "@/lib/playground";
import { createChoiceOption } from "@/lib/playground";

export function ChoiceForm({
  draft,
  onChange,
}: {
  draft: ChoiceDraft;
  onChange: (draft: ChoiceDraft) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-5">
      <ProbeEditor value={draft.state} onChange={(state) => onChange({ ...draft, state })} />
      <QuestionEditor
        value={draft.question}
        onChange={(question) => onChange({ ...draft, question })}
      />
      <div className="space-y-3">
        <FieldLabel>{t("choice.options")}</FieldLabel>
        {draft.options.map((option, index) => (
          <div
            key={option.id}
            className="relative space-y-2 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {t("choice.returnedAs")}
              </span>
              <button
                type="button"
                aria-label={t("common.remove")}
                onClick={() =>
                  onChange({
                    ...draft,
                    options: draft.options.filter((item) => item.id !== option.id),
                  })
                }
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <Input
              value={option.value}
              aria-label={`${t("choice.returnedAs")} ${index + 1}`}
              onChange={(event) =>
                onChange({
                  ...draft,
                  options: draft.options.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, value: event.target.value } : item,
                  ),
                })
              }
              className="h-9 font-mono text-xs"
            />
            <FieldLabel>{t("choice.chooseWhen")}</FieldLabel>
            <Textarea
              value={option.description}
              aria-label={`${t("choice.chooseWhen")} ${index + 1}`}
              onChange={(event) =>
                onChange({
                  ...draft,
                  options: draft.options.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, description: event.target.value } : item,
                  ),
                })
              }
              className="min-h-16 resize-y bg-background text-xs"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              ...draft,
              options: [...draft.options, createChoiceOption(draft.options.length)],
            })
          }
        >
          <Plus className="size-3.5" />
          {t("choice.addOption")}
        </Button>
      </div>
    </div>
  );
}
