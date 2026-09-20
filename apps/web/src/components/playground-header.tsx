import { Settings2, Sparkles } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";
import type { QuestionType } from "@/lib/playground";

interface PlaygroundHeaderProps {
  activeType: QuestionType;
  settingsOpen: boolean;
  onTypeChange: (type: QuestionType) => void;
  onToggleSettings: () => void;
}

const typeLabels = {
  noul: "case.noul",
  choice: "case.choice",
  score: "case.score",
} as const;

export function PlaygroundHeader({
  activeType,
  settingsOpen,
  onTypeChange,
  onToggleSettings,
}: PlaygroundHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const types: QuestionType[] = ["noul", "choice", "score"];

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-signal" />
        <h1 className="text-sm font-medium">{t("app.title")}</h1>
      </div>

      <nav className="order-3 flex min-w-0 flex-1 basis-full items-center justify-center gap-1 overflow-x-auto sm:order-none sm:basis-auto">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onTypeChange(type)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
              activeType === type
                ? "border-signal text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="font-mono text-xs text-signal">{t(`type.${type}`)}</span>
            <span>{t(typeLabels[type])}</span>
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div
          className="flex rounded-md border border-border bg-card p-0.5"
          role="group"
          aria-label={t("header.language")}
        >
          {(["en", "zh"] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setLanguage(locale)}
              className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${
                language === locale
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locale === "en" ? "EN" : "中文"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onToggleSettings}
          aria-label={t("header.settings")}
          className={`rounded-md border border-border p-2 transition-colors ${
            settingsOpen
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="size-4" />
        </button>
      </div>
    </header>
  );
}
