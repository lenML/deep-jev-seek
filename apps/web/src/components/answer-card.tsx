import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

import type { JevAnswer } from "@lenml/jevseek";

function formatProbability(value: number) {
  return `${(value * 100).toFixed(value >= 0.995 || value <= 0.005 ? 0 : 1)}%`;
}

function ProbabilityRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-medium text-foreground/85">{label}</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {formatProbability(value)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }}
        />
      </div>
    </div>
  );
}

export function AnswerCard({ answerKey, answer }: { answerKey: string; answer: JevAnswer }) {
  let content: ReactNode;

  if (answer.type === "choice") {
    const probabilities = Object.entries(answer.probabilities);
    content = (
      <>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Choice
            </span>
            <p className="font-display text-4xl leading-none text-foreground">{answer.choice}</p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
            {formatProbability(answer.confidence)} confidence
          </span>
        </div>
        <div className="space-y-3 border-t border-border/70 pt-4">
          {probabilities.map(([label, probability]) => (
            <ProbabilityRow key={label} label={label} value={probability} />
          ))}
        </div>
      </>
    );
  } else if (answer.type === "score") {
    const probabilities = Object.entries(answer.probabilities);
    content = (
      <>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Weighted score
            </span>
            <p className="font-display text-4xl leading-none text-foreground">
              {answer.score.toFixed(2)}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
            {formatProbability(answer.confidence)} confidence
          </span>
        </div>
        <div className="space-y-3 border-t border-border/70 pt-4">
          {probabilities.map(([label, probability]) => (
            <ProbabilityRow key={label} label={answer.legend[label] ?? label} value={probability} />
          ))}
        </div>
      </>
    );
  } else {
    const isTrue = answer.noul >= 0.5;
    content = (
      <>
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Noul probability
            </span>
            <p className="font-display text-4xl leading-none text-foreground">
              {isTrue ? "True" : "False"}
            </p>
          </div>
          <span className="font-mono text-3xl tabular-nums text-primary">
            {formatProbability(answer.noul)}
          </span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-secondary via-accent/35 to-primary">
          <div
            className="absolute -top-1 size-5 -translate-x-1/2 rounded-full border-4 border-card bg-foreground shadow-sm"
            style={{ left: `${Math.max(0, Math.min(100, answer.noul * 100))}%` }}
          />
        </div>
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          <span>false</span>
          <span>true</span>
        </div>
      </>
    );
  }

  return (
    <div className="rounded-md border border-border/75 bg-card/80 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {answer.type}
          </p>
          <h3 className="mt-1 text-base font-semibold">{answerKey}</h3>
        </div>
        <CheckCircle2 className="size-4 text-primary" />
      </div>
      <div className="space-y-4">{content}</div>
    </div>
  );
}
