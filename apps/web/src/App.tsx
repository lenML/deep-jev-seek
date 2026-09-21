import type { QuestionSet } from "@lenml/jevseek";
import { lazy, Suspense, useState } from "react";

import { ConnectionSettings } from "@/components/connection-settings";
import { PlaygroundHeader } from "@/components/playground-header";
import { PlaygroundInput, type InputMode } from "@/components/playground-input";
import { PlaygroundPreview, type PreviewMode } from "@/components/playground-preview";
import { useI18n } from "@/i18n/use-i18n";
import { useHashWorkspace } from "@/lib/hash-workspace";
import type { BuiltDecision, PlaygroundDrafts, QuestionType } from "@/lib/playground";
import { buildDecision } from "@/lib/playground";
import { parseMultimodalData } from "@/lib/multimodal";
import {
  applyPresetDrafts,
  createInitialDrafts,
  createPresetCatalog,
  DEFAULT_PRESET_IDS,
  findPreset,
} from "@/lib/presets";
import { runJevSeek } from "@/lib/run";
import { useWorkbenchStore } from "@/store/workbench";

const BatchPanel = lazy(() =>
  import("@/components/batch-panel").then((module) => ({ default: module.BatchPanel })),
);
const BenchmarkPanel = lazy(() =>
  import("@/components/benchmark-panel").then((module) => ({ default: module.BenchmarkPanel })),
);

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
  const [workspace, setWorkspace] = useHashWorkspace();
  const [presetIds, setPresetIds] = useState(() => ({ ...DEFAULT_PRESET_IDS }));
  const [drafts, setDrafts] = useState<PlaygroundDrafts>(() =>
    createInitialDrafts(createPresetCatalog(language)),
  );
  const [multimodalDataText, setMultimodalDataText] = useState("");
  const presetCatalog = createPresetCatalog(language);
  const activePreset = findPreset(presetCatalog, activeType, presetIds[activeType]);

  const jsonStateError = jsonError(stateText);
  const jsonQuestionsError = jsonError(questionsText);
  const multimodalData = parseMultimodalData(multimodalDataText);
  const multimodalDataError =
    connection.provider === "llamacpp" && multimodalData.invalid
      ? t("validation.multimodal")
      : null;
  const canRun =
    !isRunning &&
    (connection.provider === "llamacpp" || Boolean(connection.apiKey.trim())) &&
    !multimodalDataError &&
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
    if (connection.provider === "deepseek" && !connection.apiKey.trim()) {
      setError(t("validation.apiKey"));
      return;
    }
    if (inputMode === "json" && (jsonStateError || jsonQuestionsError)) {
      setError(t("validation.json"));
      return;
    }
    if (multimodalDataError) {
      setError(multimodalDataError);
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
        multimodal_data: connection.provider === "llamacpp" ? multimodalData.data : undefined,
      });
      setResult(output.result, output.rawExchanges, output.latencyMs);
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  function handleReset() {
    setDrafts((current) => applyPresetDrafts(current, activePreset));
    resetExamples();
    clearOutput();
  }

  function handleTypeChange(type: QuestionType) {
    const preset = findPreset(presetCatalog, type, presetIds[type]);
    setActiveType(type);
    setDrafts((current) => applyPresetDrafts(current, preset));
    clearOutput();
  }

  function handlePresetChange(presetId: string) {
    const preset = findPreset(presetCatalog, activeType, presetId);
    setPresetIds((current) => ({ ...current, [activeType]: presetId }));
    setDrafts((current) => applyPresetDrafts(current, preset));
    clearOutput();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh">
      <PlaygroundHeader
        workspace={workspace}
        settingsOpen={settingsOpen}
        onWorkspaceChange={setWorkspace}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
      />
      <ConnectionSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      {workspace === "benchmark" ? (
        <Suspense fallback={<WorkspaceFallback />}>
          <BenchmarkPanel />
        </Suspense>
      ) : workspace === "batch" ? (
        <Suspense fallback={<WorkspaceFallback />}>
          <BatchPanel />
        </Suspense>
      ) : (
        <main className="grid min-h-0 min-w-0 flex-1 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
          <PlaygroundInput
            activePresetId={activePreset.id}
            activeType={activeType}
            canRun={canRun}
            drafts={drafts}
            inputMode={inputMode}
            isRunning={isRunning}
            jsonStateError={jsonStateError}
            jsonQuestionsError={jsonQuestionsError}
            multimodalDataError={multimodalDataError}
            multimodalDataText={multimodalDataText}
            presets={presetCatalog[activeType]}
            questionsText={questionsText}
            showMultimodalData={connection.provider === "llamacpp"}
            stateText={stateText}
            onDraftsChange={setDrafts}
            onInputModeChange={setInputMode}
            onMultimodalDataTextChange={setMultimodalDataText}
            onPresetChange={handlePresetChange}
            onQuestionsTextChange={setQuestionsText}
            onReset={handleReset}
            onRun={handleRun}
            onStateTextChange={setStateText}
            onTypeChange={handleTypeChange}
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
          />{" "}
        </main>
      )}{" "}
    </div>
  );
}

function WorkspaceFallback() {
  return <div className="min-h-64 flex-1 animate-pulse bg-background" />;
}
