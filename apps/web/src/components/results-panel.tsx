import { AlertTriangle, Clock3, Gauge, Sparkles } from "lucide-react";

import type { JevSeekResponse } from "@lenml/jevseek";

import { AnswerCard } from "@/components/answer-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RawExchange } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResultsPanelProps {
  result: JevSeekResponse | null;
  rawExchanges: RawExchange[];
  error: string | null;
  latencyMs: number | null;
  completedAt: string | null;
  isRunning: boolean;
}

function EmptyResults() {
  return (
    <div className="surface-grid flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border px-6 text-center">
      <Sparkles className="mb-4 size-7 text-accent" />
      <p className="font-display text-2xl">Answers arrive here.</p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        Add a key, tune the two JSON payloads, then run SystemOne from the browser.
      </p>
    </div>
  );
}

export function ResultsPanel({
  result,
  rawExchanges,
  error,
  latencyMs,
  completedAt,
  isRunning,
}: ResultsPanelProps) {
  const usage = result?.usage;
  const rawPayload = {
    normalized: result,
    exchanges: rawExchanges,
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-primary/15 bg-[#07100c] text-foreground">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <Gauge className="size-3.5" />
              SystemOne output
            </div>
            <CardTitle>Decision ledger</CardTitle>
            <CardDescription className="text-muted-foreground">
              Normalized answers, token usage, and exact browser exchanges.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-secondary-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                isRunning
                  ? "animate-pulse bg-accent"
                  : result
                    ? "bg-primary"
                    : "bg-muted-foreground",
              )}
            />
            {isRunning ? "running" : result ? "complete" : "idle"}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5 sm:pt-6">
        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-md border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <p className="font-semibold">Run failed</p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-6">{error}</p>
            </div>
          </div>
        ) : null}

        {isRunning && !result ? (
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className="mb-5 flex gap-1.5">
              <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.2s]" />
              <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
              <span className="size-2 animate-bounce rounded-full bg-accent" />
            </div>
            <p className="font-display text-2xl">Querying DeepSeek FIM.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Each question is classified independently.
            </p>
          </div>
        ) : result ? (
          <Tabs defaultValue="answers">
            <TabsList className="max-w-full overflow-x-auto">
              <TabsTrigger value="answers">Answers</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
              <TabsTrigger value="raw">Raw response</TabsTrigger>
            </TabsList>

            <TabsContent value="answers" className="space-y-3">
              {Object.entries(result.answers).map(([answerKey, answer]) => (
                <AnswerCard key={answerKey} answerKey={answerKey} answer={answer} />
              ))}
            </TabsContent>

            <TabsContent value="usage">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Input tokens", usage?.input_tokens ?? "—"],
                  ["Output tokens", usage?.output_tokens ?? "—"],
                  ["Browser latency", latencyMs === null ? "—" : `${latencyMs}ms`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-border bg-secondary/35 p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 font-display text-4xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-md border border-border/70 px-4 py-3 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                {completedAt
                  ? `Completed ${new Date(completedAt).toLocaleString()}`
                  : "No timestamp"}
                <span className="text-border">/</span>
                model {result.model}
              </div>
            </TabsContent>

            <TabsContent value="raw">
              <pre className="editor-scroll max-h-[40rem] overflow-auto rounded-md bg-[#060c09] p-4 font-mono text-[11px] leading-5 text-[#dce8df]">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyResults />
        )}
      </CardContent>
    </Card>
  );
}
