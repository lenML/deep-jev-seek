import { Play, RotateCcw } from "lucide-react";

import { ChoiceForm } from "@/components/choice-form";
import { JsonForm } from "@/components/json-form";
import { NoulForm } from "@/components/noul-form";
import { ScoreForm } from "@/components/score-form";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/use-i18n";
import type { MessageKey } from "@/i18n/messages";
import type { PlaygroundDrafts, QuestionType } from "@/lib/playground";

export type InputMode = "form" | "json";

interface PlaygroundInputProps {
  activeType: QuestionType;
  canRun: boolean;
  drafts: PlaygroundDrafts;
  inputMode: InputMode;
  isRunning: boolean;
  jsonStateError: string | null;
  jsonQuestionsError: string | null;
  questionsText: string;
  stateText: string;
  onDraftsChange: (drafts: PlaygroundDrafts) => void;
  onInputModeChange: (mode: InputMode) => void;
  onQuestionsTextChange: (value: string) => void;
  onReset: () => void;
  onRun: () => void;
  onStateTextChange: (value: string) => void;
}

const descriptionKeys: Record<QuestionType, MessageKey> = {
  noul: "description.noul",
  choice: "description.choice",
  score: "description.score",
};

export function PlaygroundInput({
  activeType,
  canRun,
  drafts,
  inputMode,
  isRunning,
  jsonStateError,
  jsonQuestionsError,
  questionsText,
  stateText,
  onDraftsChange,
  onInputModeChange,
  onQuestionsTextChange,
  onReset,
  onRun,
  onStateTextChange,
}: PlaygroundInputProps) {
  const { t } = useI18n();

  function renderForm() {
    if (activeType === "noul") {
      return (
        <NoulForm draft={drafts.noul} onChange={(noul) => onDraftsChange({ ...drafts, noul })} />
      );
    }
    if (activeType === "choice") {
      return (
        <ChoiceForm
          draft={drafts.choice}
          onChange={(choice) => onDraftsChange({ ...drafts, choice })}
        />
      );
    }
    return (
      <ScoreForm draft={drafts.score} onChange={(score) => onDraftsChange({ ...drafts, score })} />
    );
  }

  return (
    <section className="flex min-h-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t("input.title")}
          </span>
        </div>
        <div className="flex rounded-md border border-border bg-background p-0.5">
          {(["form", "json"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onInputModeChange(mode)}
              className={`rounded px-2.5 py-1 text-xs ${
                inputMode === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(mode === "form" ? "common.form" : "common.json")}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-5 text-sm leading-5 text-muted-foreground">
          {t(descriptionKeys[activeType])}
        </p>
        {inputMode === "form" ? (
          renderForm()
        ) : (
          <JsonForm
            stateText={stateText}
            questionsText={questionsText}
            stateError={jsonStateError}
            questionsError={jsonQuestionsError}
            onStateChange={onStateTextChange}
            onQuestionsChange={onQuestionsTextChange}
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          {t("common.reset")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onRun}
          disabled={!canRun}
          className="hover:bg-signal/90 border-signal bg-signal px-4 text-signal-foreground"
        >
          <Play className="size-3.5 fill-current" />
          {t(isRunning ? "common.running" : "common.run")}
        </Button>
      </div>
    </section>
  );
}
