import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { FieldLabel, ProbeEditor, QuestionEditor, Threshold } from "@/components/form-fields";
import { useI18n } from "@/i18n/use-i18n";
import type { ScoreDraft } from "@/lib/playground";

export function ScoreForm({
  draft,
  onChange,
}: {
  draft: ScoreDraft;
  onChange: (draft: ScoreDraft) => void;
}) {
  const { t } = useI18n();
  const maximum = Math.max(0, draft.levels.length - 1);

  return (
    <div className="space-y-5">
      <ProbeEditor value={draft.state} onChange={(state) => onChange({ ...draft, state })} />
      <QuestionEditor
        value={draft.question}
        onChange={(question) => onChange({ ...draft, question })}
      />
      <div className="space-y-3">
        <FieldLabel>{t("score.levels")}</FieldLabel>
        {draft.levels.map((level, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-md border border-border bg-card p-2"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded border border-border bg-background font-mono text-xs text-signal">
              {index}
            </span>
            <Input
              value={level}
              aria-label={`${t("score.levels")} ${index + 1}`}
              onChange={(event) =>
                onChange({
                  ...draft,
                  levels: draft.levels.map((item, itemIndex) =>
                    itemIndex === index ? event.target.value : item,
                  ),
                })
              }
              className="h-9 border-0 bg-transparent px-1 shadow-none focus:ring-0"
            />
            <button
              type="button"
              aria-label={t("common.remove")}
              onClick={() =>
                onChange({
                  ...draft,
                  levels: draft.levels.filter((_, itemIndex) => itemIndex !== index),
                })
              }
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...draft, levels: [...draft.levels, `${draft.levels.length} · `] })
          }
        >
          <Plus className="size-3.5" />
          {t("score.addLevel")}
        </Button>
      </div>
      <Threshold
        value={draft.threshold}
        max={maximum}
        onChange={(threshold) => onChange({ ...draft, threshold })}
        labelKey="score.threshold"
        resultKey="score.route"
      />
    </div>
  );
}
