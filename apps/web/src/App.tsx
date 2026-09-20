import type { QuestionSet } from "@lenml/jevseek";
import { Braces, RefreshCcw, ShieldCheck, TerminalSquare } from "lucide-react";
import { useState } from "react";

import { ConnectionPanel } from "@/components/connection-panel";
import { JsonEditorCard } from "@/components/json-editor-card";
import { ResultsPanel } from "@/components/results-panel";
import { RunControlCard } from "@/components/run-control-card";
import { WorkbenchHero } from "@/components/workbench-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function App() {
  const connection = useWorkbenchStore((state) => state.connection);
  const stateText = useWorkbenchStore((state) => state.stateText);
  const questionsText = useWorkbenchStore((state) => state.questionsText);
  const result = useWorkbenchStore((state) => state.result);
  const rawExchanges = useWorkbenchStore((state) => state.rawExchanges);
  const error = useWorkbenchStore((state) => state.error);
  const isRunning = useWorkbenchStore((state) => state.isRunning);
  const latencyMs = useWorkbenchStore((state) => state.latencyMs);
  const completedAt = useWorkbenchStore((state) => state.completedAt);
  const setStateText = useWorkbenchStore((state) => state.setStateText);
  const setQuestionsText = useWorkbenchStore((state) => state.setQuestionsText);
  const setRunning = useWorkbenchStore((state) => state.setRunning);
  const setResult = useWorkbenchStore((state) => state.setResult);
  const setError = useWorkbenchStore((state) => state.setError);
  const resetExamples = useWorkbenchStore((state) => state.resetExamples);
  const clearOutput = useWorkbenchStore((state) => state.clearOutput);
  const [copied, setCopied] = useState(false);

  const stateError = jsonError(stateText);
  const questionsError = jsonError(questionsText);
  const canRun = !isRunning && Boolean(connection.apiKey.trim()) && !stateError && !questionsError;

  async function handleRun() {
    if (!connection.apiKey.trim()) {
      setError("Add a DeepSeek API key first.");
      return;
    }
    if (stateError || questionsError) {
      setError("Fix the JSON editors before running.");
      return;
    }

    const parsedState = parseJson(stateText);
    const parsedQuestions = parseJson(questionsText);
    if (
      typeof parsedQuestions !== "object" ||
      parsedQuestions === null ||
      Array.isArray(parsedQuestions)
    ) {
      setError("Questions must be a JSON object keyed by question name.");
      return;
    }

    clearOutput();
    setRunning(true);
    try {
      const output = await runJevSeek({
        connection,
        state: parsedState,
        questions: parsedQuestions as QuestionSet,
      });
      setResult(output.result, output.rawExchanges, output.latencyMs);
    } catch (runError) {
      setError(errorMessage(runError));
    } finally {
      setRunning(false);
    }
  }

  async function copyRaw() {
    await navigator.clipboard.writeText(JSON.stringify({ result, rawExchanges }, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="min-h-screen overflow-hidden">
      <header className="border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-accent/70 bg-accent text-accent-foreground shadow-lift">
              <TerminalSquare className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">JevSeek</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                browser workbench
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary sm:flex">
            <ShieldCheck className="size-3.5" />
            No key upload
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
        <WorkbenchHero />

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <ConnectionPanel />
            <RunControlCard
              canRun={canRun}
              hasApiKey={Boolean(connection.apiKey.trim())}
              isRunning={isRunning}
              onRun={handleRun}
            />
          </aside>

          <section className="min-w-0 space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-md bg-accent/10 text-accent">
                    <Braces className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Request payloads</p>
                    <p className="text-xs text-muted-foreground">
                      JSON is parsed in this tab before any request is sent.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={resetExamples}>
                    <RefreshCcw className="size-3.5" />
                    Reset examples
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearOutput}
                    disabled={!result && !error && rawExchanges.length === 0}
                  >
                    Clear output
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 2xl:grid-cols-2">
              <JsonEditorCard
                title="State"
                eyebrow="input / state"
                description="Any JSON value. Objects are serialized deterministically by the package."
                value={stateText}
                error={stateError}
                onChange={setStateText}
              />
              <JsonEditorCard
                title="Questions"
                eyebrow="input / questions"
                description="Top-level object. Each entry uses choice, score, or noul."
                value={questionsText}
                error={questionsError}
                onChange={setQuestionsText}
              />
            </div>

            <ResultsPanel
              result={result}
              rawExchanges={rawExchanges}
              error={error}
              latencyMs={latencyMs}
              completedAt={completedAt}
              isRunning={isRunning}
            />

            {result ? (
              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={copyRaw}>
                  {copied ? "Copied JSON" : "Copy normalized + raw JSON"}
                </Button>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <footer className="border-t border-border/70">
        <div className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>@lenml/jevseek browser workbench</p>
          <p>Your key stays in this browser. DeepSeek receives the FIM request directly.</p>
        </div>
      </footer>
    </div>
  );
}
