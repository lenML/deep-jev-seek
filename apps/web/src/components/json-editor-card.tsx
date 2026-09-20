import { AlertCircle, Braces } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface JsonEditorCardProps {
  title: string;
  eyebrow: string;
  description: string;
  value: string;
  error: string | null;
  onChange: (value: string) => void;
  className?: string;
}

export function JsonEditorCard({
  title,
  eyebrow,
  description,
  value,
  error,
  onChange,
  className,
}: JsonEditorCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/70 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              <Braces className="size-3.5" />
              {eyebrow}
            </div>
            <CardTitle>{title}</CardTitle>
          </div>
          <span
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em]",
              error
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-primary/25 bg-primary/10 text-primary",
            )}
          >
            {error ? "invalid json" : "valid json"}
          </span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          spellCheck={false}
          className="editor-scroll min-h-[23rem] resize-y rounded-none border-0 bg-[#18211c] px-4 py-4 font-mono text-[12px] leading-5 text-[#e9eadf] shadow-none focus:border-0 focus:ring-2 focus:ring-inset focus:ring-accent/75 sm:px-5"
        />
        {error ? (
          <div className="flex items-start gap-2 border-t border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
