import { DEFAULT_PROMPT_TEMPLATE } from "@lenml/jevseek";
import { RotateCcw } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import { useWorkbenchStore } from "@/store/workbench";

const placeholders = ["{{state}}", "{{question}}", "{{questionType}}", "{{codes}}"] as const;

export function PromptTemplateEditor() {
  const { t } = useI18n();
  const promptTemplate = useWorkbenchStore((state) => state.connection.promptTemplate);
  const setPromptTemplate = useWorkbenchStore((state) => state.setPromptTemplate);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Label htmlFor="prompt-template">{t("connection.promptTemplate")}</Label>
          <p
            id="prompt-template-hint"
            className="max-w-3xl text-[11px] leading-4 text-muted-foreground"
          >
            {t("connection.promptTemplateHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPromptTemplate(DEFAULT_PROMPT_TEMPLATE)}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <RotateCcw className="size-3" />
          {t("connection.resetPrompt")}
        </button>
      </div>
      <Textarea
        id="prompt-template"
        value={promptTemplate}
        aria-describedby="prompt-template-hint"
        onChange={(event) => setPromptTemplate(event.target.value)}
        spellCheck={false}
        className="editor-scroll min-h-56 resize-y bg-background font-mono text-[11px] leading-5"
      />
      <div className="flex flex-wrap gap-2">
        {placeholders.map((placeholder) => (
          <code
            key={placeholder}
            className="rounded border border-border bg-card px-2 py-1 font-mono text-[10px] text-signal"
          >
            {placeholder}
          </code>
        ))}
      </div>
    </div>
  );
}
