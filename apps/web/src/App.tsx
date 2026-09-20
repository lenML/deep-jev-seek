import type { QuestionSet } from "@lenml/jevseek";
import { ArrowRight, Braces, Play, RefreshCcw, ShieldCheck, TerminalSquare } from "lucide-react";
import { useState } from "react";

import { ConnectionPanel } from "@/components/connection-panel";
import { JsonEditorCard } from "@/components/json-editor-card";
import { ResultsPanel } from "@/components/results-panel";
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
            <div className="grid size-9 place-items-center rounded-md border border-foreground bg-foreground text-background shadow-lift">
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
        <section className="relative mb-10 grid gap-8 lg:mb-14 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-end">
          <div className="relative z-10">
            <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-px w-8 bg-accent" />
              DeepSeek FIM, shaped like Jev
            </div>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.94] tracking-[-0.035em] sm:text-6xl lg:text-7xl">
              Turn token logprobs into a<span className="italic text-primary"> decision.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Edit one state and a question set. JevSeek calls the FIM endpoint directly from your
              browser and normalizes the result into choice, score, and noul answers.
            </p>
          </div>

          <div className="relative rounded-lg border border-border bg-card/75 p-5 shadow-paper backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Execution path
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-primary">
                direct
              </span>
            </div>
            <div className="space-y-3">
              {[
                ["01", "Your browser", "state + questions"],
                ["02", "DeepSeek FIM", "top logprobs"],
                ["03", "JevSeek", "choice / score / noul"],
              ].map(([index, label, detail], itemIndex) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-accent">{index}</span>
                  <div className="min-w-0 flex-1 rounded-md border border-border/75 bg-background/60 px-3 py-2.5">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                      {detail}
                    </p>
                  </div>
                  {itemIndex < 2 ? (
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
            <ConnectionPanel />
            <Card className="overflow-hidden bg-primary text-primary-foreground">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary-foreground/65">
                      Run control
                    </p>
                    <p className="mt-1 font-display text-2xl">SystemOne</p>
                  </div>
                  <Play className="size-5 text-primary-foreground/75" />
                </div>
                <Button
                  type="button"
                  onClick={handleRun}
                  disabled={!canRun}
                  size="lg"
                  variant="secondary"
                  className="mt-5 w-full border-primary-foreground/15 bg-primary-foreground text-primary shadow-none hover:bg-primary-foreground/90"
                >
                  {isRunning ? (
                    <>
                      <RefreshCcw className="size-4 animate-spin" />
                      Classifying
                    </>
                  ) : (
                    <>
                      <Play className="size-4 fill-current" />
                      Run from browser
                    </>
                  )}
                </Button>
                <p className="mt-3 text-xs leading-5 text-primary-foreground/65">
                  {connection.apiKey.trim()
                    ? "Key loaded locally."
                    : "Add an API key to enable the run."}
                </p>
              </CardContent>
            </Card>
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
