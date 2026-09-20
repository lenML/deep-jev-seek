import { Play, RotateCcw } from "lucide-react";

import { ChoiceForm } from "@/components/choice-form";
import { JsonForm } from "@/components/json-form";
import { MultimodalDataField } from "@/components/multimodal-data-field";
import { NoulForm } from "@/components/noul-form";
import { ScoreForm } from "@/components/score-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  multimodalDataError: string | null;
  multimodalDataText: string;
  questionsText: string;
  showMultimodalData: boolean;
  stateText: string;
  onDraftsChange: (drafts: PlaygroundDrafts) => void;
  onInputModeChange: (mode: InputMode) => void;
  onMultimodalDataTextChange: (value: string) => void;
  onQuestionsTextChange: (value: string) => void;
  onReset: () => void;
  onRun: () => void;
  onStateTextChange: (value: string) => void;
  onTypeChange: (type: QuestionType) => void;
}

const descriptionKeys: Record<QuestionType, MessageKey> = {
  noul: "description.noul",
  choice: "description.choice",
  score: "description.score",
};

const presetKeys: Record<QuestionType, MessageKey> = {
  noul: "case.noul",
  choice: "case.choice",
  score: "case.score",
};

export function PlaygroundInput({
  activeType,
  canRun,
  drafts,
  inputMode,
  isRunning,
  jsonStateError,
  jsonQuestionsError,
  multimodalDataError,
  multimodalDataText,
  questionsText,
  showMultimodalData,
  stateText,
  onDraftsChange,
  onInputModeChange,
  onMultimodalDataTextChange,
  onQuestionsTextChange,
  onReset,
  onRun,
  onStateTextChange,
  onTypeChange,
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
    <section className="flex min-h-0 min-w-0 flex-col border-b border-border bg-card lg:border-b-0 lg:border-r">
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
        {inputMode === "form" ? (
          <div className="mb-5 space-y-2">
            <Label htmlFor="preset-template">{t("input.preset")}</Label>
            <select
              id="preset-template"
              value={activeType}
              onChange={(event) => onTypeChange(event.target.value as QuestionType)}
              className="focus:ring-ring/20 h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2"
            >
              {(["noul", "choice", "score"] as const).map((type) => (
                <option key={type} value={type}>
                  {t(presetKeys[type])}
                </option>
              ))}
            </select>
            <p className="text-sm leading-5 text-muted-foreground">
              {t(descriptionKeys[activeType])}
            </p>
          </div>
        ) : null}
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
        {showMultimodalData ? (
          <MultimodalDataField
            error={multimodalDataError}
            value={multimodalDataText}
            onChange={onMultimodalDataTextChange}
          />
        ) : null}
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
