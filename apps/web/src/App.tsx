import type { QuestionSet } from "@lenml/jevseek";
import { useState } from "react";

import { ConnectionSettings } from "@/components/connection-settings";
import { PlaygroundHeader } from "@/components/playground-header";
import { PlaygroundInput, type InputMode } from "@/components/playground-input";
import { PlaygroundPreview, type PreviewMode } from "@/components/playground-preview";
import { useI18n } from "@/i18n/use-i18n";
import type { BuiltDecision, PlaygroundDrafts, QuestionType } from "@/lib/playground";
import { buildDecision, createDrafts } from "@/lib/playground";
import { runJevSeek } from "@/lib/run";
import { useWorkbenchStore } from "@/store/workbench";

function jsonError(value: string) {
  try {
    JSON.parse(value);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Invalid JSON";
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function App() {
  const { language, t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const stateText = useWorkbenchStore((state) => state.stateText);
  const questionsText = useWorkbenchStore((state) => state.questionsText);
  const result = useWorkbenchStore((state) => state.result);
  const rawExchanges = useWorkbenchStore((state) => state.rawExchanges);
  const error = useWorkbenchStore((state) => state.error);
  const isRunning = useWorkbenchStore((state) => state.isRunning);
  const latencyMs = useWorkbenchStore((state) => state.latencyMs);
  const setStateText = useWorkbenchStore((state) => state.setStateText);
  const setQuestionsText = useWorkbenchStore((state) => state.setQuestionsText);
  const setRunning = useWorkbenchStore((state) => state.setRunning);
  const setResult = useWorkbenchStore((state) => state.setResult);
  const setError = useWorkbenchStore((state) => state.setError);
  const resetExamples = useWorkbenchStore((state) => state.resetExamples);
  const clearOutput = useWorkbenchStore((state) => state.clearOutput);

  const [activeType, setActiveType] = useState<QuestionType>("noul");
  const [inputMode, setInputMode] = useState<InputMode>("form");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("preview");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drafts, setDrafts] = useState<PlaygroundDrafts>(() => createDrafts(language));

  const jsonStateError = jsonError(stateText);
  const jsonQuestionsError = jsonError(questionsText);
  const canRun =
    !isRunning &&
    Boolean(connection.apiKey.trim()) &&
    (inputMode === "form" || (!jsonStateError && !jsonQuestionsError));

  const threshold =
    inputMode === "json"
      ? 50
      : activeType === "noul"
        ? drafts.noul.threshold
        : activeType === "score"
          ? drafts.score.threshold
          : 50;

  function buildPayload(): BuiltDecision {
    if (inputMode === "form") {
      return buildDecision(activeType, drafts);
    }

    const parsedQuestions = JSON.parse(questionsText) as unknown;
    if (
      typeof parsedQuestions !== "object" ||
      parsedQuestions === null ||
      Array.isArray(parsedQuestions)
    ) {
      throw new Error(t("validation.questions"));
    }

    return {
      state: JSON.parse(stateText) as BuiltDecision["state"],
      questions: parsedQuestions as QuestionSet,
      threshold: 50,
    };
  }

  async function handleRun() {
    if (!connection.apiKey.trim()) {
      setError(t("validation.apiKey"));
      return;
    }
    if (inputMode === "json" && (jsonStateError || jsonQuestionsError)) {
      setError(t("validation.json"));
      return;
    }

    clearOutput();
    setRunning(true);
    try {
      const payload = buildPayload();
      const output = await runJevSeek({
        connection,
        state: payload.state,
        questions: payload.questions,
      });
      setResult(output.result, output.rawExchanges, output.latencyMs);
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setDrafts(createDrafts(language));
    resetExamples();
    clearOutput();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh">
      <PlaygroundHeader
        activeType={activeType}
        settingsOpen={settingsOpen}
        onTypeChange={setActiveType}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
      />
      {settingsOpen ? <ConnectionSettings /> : null}

      <main className="grid min-h-0 flex-1 lg:grid-cols-[390px_minmax(0,1fr)]">
        <PlaygroundInput
          activeType={activeType}
          canRun={canRun}
          drafts={drafts}
          inputMode={inputMode}
          isRunning={isRunning}
          jsonStateError={jsonStateError}
          jsonQuestionsError={jsonQuestionsError}
          questionsText={questionsText}
          stateText={stateText}
          onDraftsChange={setDrafts}
          onInputModeChange={setInputMode}
          onQuestionsTextChange={setQuestionsText}
          onReset={handleReset}
          onRun={handleRun}
          onStateTextChange={setStateText}
        />
        <PlaygroundPreview
          threshold={threshold}
          result={result}
          rawExchanges={rawExchanges}
          error={error}
          isRunning={isRunning}
          mode={previewMode}
          latencyMs={latencyMs}
          onModeChange={setPreviewMode}
        />
      </main>
    </div>
  );
}
