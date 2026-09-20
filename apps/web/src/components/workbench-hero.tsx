import { ArrowRight } from "lucide-react";

const executionSteps = [
  ["01", "Your browser", "state + questions"],
  ["02", "DeepSeek FIM", "top logprobs"],
  ["03", "JevSeek", "choice / score / noul"],
] as const;

export function WorkbenchHero() {
  return (
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
          {executionSteps.map(([index, label, detail], itemIndex) => (
            <div key={index} className="flex items-center gap-3">
              <span className="font-mono text-xs text-accent">{index}</span>
              <div className="min-w-0 flex-1 rounded-md border border-border/75 bg-background/60 px-3 py-2.5">
                <p className="text-sm font-semibold">{label}</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                  {detail}
                </p>
              </div>
              {itemIndex < executionSteps.length - 1 ? (
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
