import { Play, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface RunControlCardProps {
  canRun: boolean;
  hasApiKey: boolean;
  isRunning: boolean;
  onRun: () => void;
}

export function RunControlCard({ canRun, hasApiKey, isRunning, onRun }: RunControlCardProps) {
  return (
    <Card className="overflow-hidden border-primary/25 bg-[#0d2119] text-foreground">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary/70">
              Run control
            </p>
            <p className="mt-1 font-display text-2xl">SystemOne</p>
          </div>
          <Play className="size-5 text-primary/75" />
        </div>
        <Button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          size="lg"
          className="mt-5 w-full shadow-none"
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
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {hasApiKey ? "Key loaded locally." : "Add an API key to enable the run."}
        </p>
      </CardContent>
    </Card>
  );
}
